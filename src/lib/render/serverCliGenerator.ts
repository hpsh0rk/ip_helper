import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { translateAndRefineChinesePrompt } from '@/lib/i18n/promptTranslator';

const BRAIN_DIR = process.env.AGY_BRAIN_DIR || path.join(process.env.HOME || '', '.gemini/antigravity-cli/brain');
const AGY_BIN = process.env.AGY_BIN || path.join(process.env.HOME || '', '.local/bin/agy');
const LOGS_DIR = path.join(process.cwd(), 'data', 'logs');

export interface TraceLogItem {
  timestamp: string;
  step: string;
  message: string;
  status: 'info' | 'success' | 'warning' | 'error';
  elapsedMs?: number;
}

export interface RenderExecutionResult {
  success: boolean;
  logId: string;
  convId?: string;
  imageUrl?: string;
  imageUrls: string[];
  elapsedMs: number;
  provider: string;
  generatedAt: string;
  refinedPrompt: string;
  traceLogs: TraceLogItem[];
  error?: string;
  diagnosticAdvice?: string;
  modelFeedback?: string;
}

/**
 * Saves diagnostic log to disk for agent tracing
 */
export function saveDiagnosticLog(data: {
  logId: string;
  timestamp: string;
  convId?: string;
  success: boolean;
  prompt: string;
  refinedPrompt: string;
  elapsedMs: number;
  traceLogs: TraceLogItem[];
  error?: string;
  diagnosticAdvice?: string;
  modelFeedback?: string;
  stdout?: string;
  stderr?: string;
}) {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    const logFilePath = path.join(LOGS_DIR, `${data.logId}.json`);
    fs.writeFileSync(logFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save diagnostic log:', err);
  }
}

/**
 * Reads diagnostic log by log ID
 */
export function getDiagnosticLog(logId: string) {
  try {
    const cleanId = logId.trim().toUpperCase();
    const logFilePath = path.join(LOGS_DIR, `${cleanId}.json`);
    if (fs.existsSync(logFilePath)) {
      return JSON.parse(fs.readFileSync(logFilePath, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to read diagnostic log:', err);
  }
  return null;
}

/**
 * Executes a single image generation via local Antigravity CLI (agy -p)
 * Supports text-to-image and image-to-image (reference image derivation)
 */
async function generateSingleImageCli(
  refinedPrompt: string,
  index: number = 1,
  referenceImageUrl?: string
): Promise<{ 
  imageUrl: string; 
  logs: TraceLogItem[]; 
  convId?: string;
  error?: string; 
  modelFeedback?: string;
  diagnosticAdvice?: string;
  stdoutData?: string;
  stderrData?: string;
}> {
  const startTime = Date.now();
  const logs: TraceLogItem[] = [];

  // Fast path for test environment
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    const dummySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="450" height="600"><rect width="100%" height="100%" fill="#18181b"/><text x="50%" y="50%" fill="#a1a1aa" font-size="20" text-anchor="middle">Test Mock Image ${index}</text></svg>`;
    logs.push({
      timestamp: new Date().toISOString(),
      step: 'TEST_ENV',
      message: referenceImageUrl ? '测试环境快速模拟图生图衍生' : '测试环境快速模拟出图',
      status: 'success',
      elapsedMs: 5
    });
    return {
      imageUrl: `data:image/svg+xml;base64,${Buffer.from(dummySvg).toString('base64')}`,
      logs
    };
  }

  // Handle reference image if provided (Image-to-Image)
  let tempRefPath: string | null = null;
  if (referenceImageUrl) {
    try {
      const storageDir = path.join(BRAIN_DIR, '.tempmediaStorage');
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      if (referenceImageUrl.startsWith('data:image')) {
        const base64Data = referenceImageUrl.replace(/^data:image\/\w+;base64,/, '');
        tempRefPath = path.join(storageDir, `ref_${Date.now()}_${index}.png`);
        fs.writeFileSync(tempRefPath, Buffer.from(base64Data, 'base64'));
      } else if (fs.existsSync(referenceImageUrl)) {
        tempRefPath = referenceImageUrl;
      }

      if (tempRefPath) {
        logs.push({
          timestamp: new Date().toISOString(),
          step: 'IMAGE_TO_IMAGE_MOUNT',
          message: `[图${index}] 已挂载参考基准图: ${path.basename(tempRefPath)}，启用图生图一致性衍生机制`,
          status: 'info'
        });
      }
    } catch (err: any) {
      logs.push({
        timestamp: new Date().toISOString(),
        step: 'IMAGE_TO_IMAGE_WARN',
        message: `[图${index}] 参考图解析异常，将使用纯文本提示词生成: ${err?.message}`,
        status: 'warning'
      });
    }
  }

  const beforeTime = Date.now() - 3000;
  const safePrompt = refinedPrompt.replace(/"/g, '\\"').slice(0, 1000);
  const refParam = tempRefPath ? `, ImagePaths: [\\"${tempRefPath}\\"]` : '';
  const command = `${AGY_BIN} -p "Please call tool generate_image with prompt: ${safePrompt}${refParam}" --dangerously-skip-permissions`;

  logs.push({
    timestamp: new Date().toISOString(),
    step: 'CLI_DISPATCH',
    message: `[图${index}] 调度 Antigravity CLI 独立无头进程 (agy -p)${tempRefPath ? ' [图生图模式]' : ''}`,
    status: 'info'
  });

  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';

    const proc = exec(command, { timeout: 120000 }, (error) => {
      const elapsedMs = Date.now() - startTime;
      let matchedConvId: string | undefined;
      let modelFeedback: string | undefined;
      let diagnosticAdvice: string | undefined;

      if (error) {
        logs.push({
          timestamp: new Date().toISOString(),
          step: 'CLI_ERROR',
          message: `[图${index}] CLI 进程退出异常: ${error.message}`,
          status: 'error',
          elapsedMs
        });
      }

      // 1. Direct Regex match from stdout
      const match = stdoutData.match(/Generated image is saved at\s+([^\s]+\.(?:jpg|png|webp|jpeg))/i);
      if (match && fs.existsSync(match[1])) {
        const filePath = match[1];
        logs.push({
          timestamp: new Date().toISOString(),
          step: 'IMAGE_MATCH_STDOUT',
          message: `[图${index}] 从 CLI 日志中精准捕获产物路径: ${path.basename(filePath)}`,
          status: 'success',
          elapsedMs
        });
        const buf = fs.readFileSync(filePath);
        return resolve({
          imageUrl: `data:image/jpeg;base64,${buf.toString('base64')}`,
          logs,
          stdoutData,
          stderrData
        });
      }

      // 2. Scan recent conversation directories in brain
      try {
        if (fs.existsSync(BRAIN_DIR)) {
          const convs = fs.readdirSync(BRAIN_DIR).map(name => {
            const fullPath = path.join(BRAIN_DIR, name);
            try {
              return { name, path: fullPath, stat: fs.statSync(fullPath) };
            } catch {
              return null;
            }
          }).filter((item): item is { name: string; path: string; stat: fs.Stats } => 
            item !== null && item.stat.isDirectory() && item.stat.mtimeMs >= beforeTime
          ).sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

          if (convs.length > 0) {
            matchedConvId = convs[0].name;
            const conv = convs[0];

            // 2.1 Check if image file exists
            try {
              const files = fs.readdirSync(conv.path);
              for (const file of files) {
                if (file.endsWith('.jpg') || file.endsWith('.png')) {
                  const filePath = path.join(conv.path, file);
                  const stat = fs.statSync(filePath);
                  if (stat.mtimeMs >= beforeTime) {
                    logs.push({
                      timestamp: new Date().toISOString(),
                      step: 'IMAGE_MATCH_SCAN',
                      message: `[图${index}] 捕获最新渲染产物: ${file} (会话 ID: ${conv.name.slice(0, 8)})`,
                      status: 'success',
                      elapsedMs
                    });
                    const buf = fs.readFileSync(filePath);
                    return resolve({
                      imageUrl: `data:image/jpeg;base64,${buf.toString('base64')}`,
                      convId: conv.name,
                      logs,
                      stdoutData,
                      stderrData
                    });
                  }
                }
              }
            } catch {
              // skip
            }

            // 2.2 Deep inspect transcript.jsonl for explicit model reasons (429, safety, quota, etc.)
            try {
              const transcriptPath = path.join(conv.path, '.system_generated', 'logs', 'transcript.jsonl');
              if (fs.existsSync(transcriptPath)) {
                const lines = fs.readFileSync(transcriptPath, 'utf-8').trim().split('\n');
                for (let i = lines.length - 1; i >= 0; i--) {
                  try {
                    const stepObj = JSON.parse(lines[i]);
                    if (stepObj.content && typeof stepObj.content === 'string') {
                      const contentText = stepObj.content.trim();
                      if (
                        contentText.includes('429') ||
                        contentText.includes('RESOURCE_EXHAUSTED') ||
                        contentText.includes('配额') ||
                        contentText.includes('Too Many Requests') ||
                        contentText.includes('error') ||
                        contentText.includes('错误') ||
                        contentText.includes('安全') ||
                        contentText.includes('Policy')
                      ) {
                        modelFeedback = contentText;
                        break;
                      }
                    }
                  } catch {
                    // skip
                  }
                }
              }
            } catch {
              // skip
            }
          }
        }
      } catch {
        // ignore scan errors
      }

      // 3. Construct specific diagnostic information
      if (modelFeedback) {
        if (
          modelFeedback.includes('429') ||
          modelFeedback.includes('RESOURCE_EXHAUSTED') ||
          modelFeedback.includes('配额') ||
          modelFeedback.includes('Too Many Requests')
        ) {
          diagnosticAdvice = '上游生图模型配额超限 (429 Too Many Requests / RESOURCE_EXHAUSTED)。通常为 API 临时调用量用尽，预计在 1~2 小时后自动重置配额。';
          logs.push({
            timestamp: new Date().toISOString(),
            step: 'QUOTA_EXHAUSTED',
            message: `[图${index}] 上游返回明确配额耗尽原因: ${modelFeedback.replace(/\n+/g, ' ').slice(0, 160)}...`,
            status: 'error',
            elapsedMs
          });
        } else {
          diagnosticAdvice = `上游模型提示: ${modelFeedback.slice(0, 120)}`;
          logs.push({
            timestamp: new Date().toISOString(),
            step: 'UPSTREAM_FEEDBACK',
            message: `[图${index}] 捕获到模型返回原因: ${modelFeedback.replace(/\n+/g, ' ').slice(0, 160)}...`,
            status: 'error',
            elapsedMs
          });
        }
      } else {
        logs.push({
          timestamp: new Date().toISOString(),
          step: 'CLI_NO_OUTPUT',
          message: `[图${index}] 未在预期时间内捕获到生成的图片文件 (耗时 ${(elapsedMs / 1000).toFixed(1)}s)`,
          status: 'error',
          elapsedMs
        });
      }

      resolve({
        imageUrl: '',
        convId: matchedConvId,
        logs,
        modelFeedback,
        diagnosticAdvice,
        stdoutData,
        stderrData,
        error: modelFeedback ? `上游生图服务提示: ${modelFeedback.split('\n')[0]}` : `CLI 生图未能在超时时间内产出文件 (耗时 ${(elapsedMs / 1000).toFixed(1)}s)`
      });
    });

    proc.stdout?.on('data', chunk => {
      stdoutData += chunk;
    });
    proc.stderr?.on('data', chunk => {
      stderrData += chunk;
    });
  });
}

/**
 * Server-only module to execute real image generation via Antigravity CLI (agy -p)
 * Supports single & multi-image batch generation, text-to-image and image-to-image reference derivation,
 * and structured Log ID tracking for agent troubleshooting
 */
export async function generateImageViaServerCli(
  prompt: string,
  options: { width?: number; height?: number; ipName?: string; count?: number; referenceImageUrl?: string } = {}
): Promise<RenderExecutionResult> {
  const overallStart = Date.now();
  const count = Math.min(Math.max(options.count || 1, 1), 4);
  const traceLogs: TraceLogItem[] = [];

  // Generate a distinct human-readable Log ID
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  let logId = `LOG-${dateStr}-${randomSuffix}`;

  // Step 1: Semantic Purification
  const refinedPrompt = translateAndRefineChinesePrompt(prompt);
  traceLogs.push({
    timestamp: new Date().toISOString(),
    step: 'PROMPT_COMPILE',
    message: `Prompt 语义净化与英文编译完成 (输入: "${prompt.slice(0, 30)}..." ➔ 编译后 ${refinedPrompt.split(' ').length} 个 Tokens)`,
    status: 'success',
    elapsedMs: Date.now() - overallStart
  });

  if (options.referenceImageUrl) {
    traceLogs.push({
      timestamp: new Date().toISOString(),
      step: 'REFERENCE_IMAGE_DETECTED',
      message: `检测到参考基准图输入，将启动图生图/参考图衍生管线 (Image-to-Image)`,
      status: 'info',
      elapsedMs: Date.now() - overallStart
    });
  }

  traceLogs.push({
    timestamp: new Date().toISOString(),
    step: 'BATCH_INIT',
    message: `初始化渲染队列：计划生成 ${count} 张商业级原画${options.referenceImageUrl ? ' [基于参考图衍生]' : ''}`,
    status: 'info'
  });

  // Execute batch generation concurrently via Promise.all
  const batchPromises = Array.from({ length: count }, (_, i) => {
    const variedPrompt = count > 1 
      ? `${refinedPrompt}, distinct visual angle and perspective variation #${i + 1}`
      : refinedPrompt;
    return generateSingleImageCli(variedPrompt, i + 1, options.referenceImageUrl);
  });

  const batchResults = await Promise.all(batchPromises);
  const generatedUrls: string[] = [];
  let detectedConvId: string | undefined;
  let detectedModelFeedback: string | undefined;
  let detectedAdvice: string | undefined;
  let combinedStdout = '';
  let combinedStderr = '';

  for (const result of batchResults) {
    traceLogs.push(...result.logs);
    if (result.imageUrl) {
      generatedUrls.push(result.imageUrl);
    }
    if (result.convId && !detectedConvId) {
      detectedConvId = result.convId;
      // Refine logId to include convId prefix for instant agent lookup
      logId = `LOG-${dateStr}-${result.convId.slice(0, 8).toUpperCase()}`;
    }
    if (result.modelFeedback && !detectedModelFeedback) {
      detectedModelFeedback = result.modelFeedback;
    }
    if (result.diagnosticAdvice && !detectedAdvice) {
      detectedAdvice = result.diagnosticAdvice;
    }
    if (result.stdoutData) combinedStdout += result.stdoutData + '\n';
    if (result.stderrData) combinedStderr += result.stderrData + '\n';
  }

  const totalElapsedMs = Date.now() - overallStart;
  const isSuccess = generatedUrls.length > 0;

  traceLogs.push({
    timestamp: new Date().toISOString(),
    step: 'LOG_ID_ASSIGNED',
    message: `已分配独立排障诊断编号: 【${logId}】(会话 ID: ${detectedConvId || '无'})`,
    status: 'info',
    elapsedMs: totalElapsedMs
  });

  if (isSuccess) {
    traceLogs.push({
      timestamp: new Date().toISOString(),
      step: 'RENDER_COMPLETE',
      message: `🎉 渲染全部就绪！成功输出 ${generatedUrls.length}/${count} 张高保真原画，总耗时 ${(totalElapsedMs / 1000).toFixed(1)}s`,
      status: 'success',
      elapsedMs: totalElapsedMs
    });
  } else {
    traceLogs.push({
      timestamp: new Date().toISOString(),
      step: 'RENDER_FAILED',
      message: `❌ 渲染未产出有效图片。诊断建议: ${detectedAdvice || '请检查 CLI 或重试'}`,
      status: 'error',
      elapsedMs: totalElapsedMs
    });
  }

  const executionResult: RenderExecutionResult = {
    success: isSuccess,
    logId,
    convId: detectedConvId,
    imageUrl: generatedUrls[0] || '',
    imageUrls: generatedUrls,
    elapsedMs: totalElapsedMs,
    provider: 'antigravity-cli',
    generatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    refinedPrompt,
    traceLogs,
    error: isSuccess ? undefined : (detectedModelFeedback ? `上游服务响应异常: ${detectedModelFeedback.split('\n')[0]}` : '生成超时或环境未产出图片'),
    diagnosticAdvice: detectedAdvice || (isSuccess ? undefined : '建议检查本地 agy 权限或稍后重试。'),
    modelFeedback: detectedModelFeedback
  };

  // Save diagnostic log to data/logs/${logId}.json
  saveDiagnosticLog({
    logId,
    timestamp: new Date().toISOString(),
    convId: detectedConvId,
    success: isSuccess,
    prompt,
    refinedPrompt,
    elapsedMs: totalElapsedMs,
    traceLogs,
    error: executionResult.error,
    diagnosticAdvice: executionResult.diagnosticAdvice,
    modelFeedback: detectedModelFeedback,
    stdout: combinedStdout,
    stderr: combinedStderr
  });

  return executionResult;
}
