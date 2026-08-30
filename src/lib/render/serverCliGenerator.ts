import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { translateAndRefineChinesePrompt } from '@/lib/i18n/promptTranslator';

const BRAIN_DIR = process.env.AGY_BRAIN_DIR || path.join(process.env.HOME || '', '.gemini/antigravity-cli/brain');
const AGY_BIN = process.env.AGY_BIN || path.join(process.env.HOME || '', '.local/bin/agy');
const LOGS_DIR = path.join(process.cwd(), 'data', 'logs');
const CLI_TIMEOUT_MS = Number(process.env.AGY_TIMEOUT_MS) || 300000; // 5 minutes default (300s), matching agy print-timeout

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
 * Global FIFO rendering queue to serialize local CLI calls
 * and prevent concurrent process race conditions and rate limits.
 */
let renderQueueChain: Promise<any> = Promise.resolve();

function enqueueRenderJob<T>(job: () => Promise<T>): Promise<T> {
  const next = renderQueueChain.then(() => job(), () => job());
  renderQueueChain = next.catch(() => {});
  return next;
}

/**
 * Extracts distinctive core action/scene keywords from a prompt
 * to verify that a conversation transcript genuinely belongs to this specific frame.
 */
function extractPromptKeywords(prompt: string): string[] {
  const commonTokens = new Set([
    'character', 'main', 'masterpiece', 'quality', 'resolution', 'image', 'frame',
    'style', 'claymation', 'single', 'standalone', 'portrait', 'aspect', 'ratio',
    'vertical', 'render', 'wholesome', 'super', 'cute', 'best', 'lighting',
    'textures', 'diorama', 'studio', 'view', 'full', 'visible', 'expressive'
  ]);

  return prompt
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !commonTokens.has(w))
    .slice(0, 12);
}

function verifyTranscriptPromptMatch(transcriptContent: string, keywords: string[]): { matched: boolean; score: number; matchedWords: string[] } {
  if (keywords.length === 0) return { matched: true, score: 1, matchedWords: [] };
  const lowerTranscript = transcriptContent.toLowerCase();
  const matchedWords = keywords.filter(k => lowerTranscript.includes(k));
  const score = matchedWords.length / keywords.length;
  // Require at least 2 distinct keywords or >= 35% match
  const matched = matchedWords.length >= Math.min(2, Math.ceil(keywords.length * 0.35));
  return { matched, score, matchedWords };
}

/**
 * Internal single image generation execution (guaranteed serialized via queue)
 */
async function executeSingleImageCliInternal(
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
  const promptKeywords = extractPromptKeywords(refinedPrompt);

  // Fast path for test environment
  if (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || Boolean(process.env?.VITEST))) {
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
      const storageDir = path.join(process.cwd(), 'data', '.tempmedia');
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

  // Pre-launch brain directory snapshot to prevent cross-session ambiguity
  const preExistingConvs = new Set<string>();
  try {
    if (fs.existsSync(BRAIN_DIR)) {
      fs.readdirSync(BRAIN_DIR).forEach(name => preExistingConvs.add(name));
    }
  } catch {
    // ignore
  }

  const beforeTime = Date.now() - 2000;
  const safePrompt = refinedPrompt.replace(/"/g, '\\"').slice(0, 1000);
  const refParam = tempRefPath ? `, ImagePaths: [\\"${tempRefPath}\\"]` : '';
  const command = `${AGY_BIN} -p "Please call tool generate_image with prompt: ${safePrompt}${refParam}" --print-timeout 300s --dangerously-skip-permissions`;

  logs.push({
    timestamp: new Date().toISOString(),
    step: 'PROMPT_SIGNATURE',
    message: `[图${index}] 提取特征关键词: [${promptKeywords.slice(0, 6).join(', ')}]，用于会话专属绑定与防串格校验`,
    status: 'info'
  });

  logs.push({
    timestamp: new Date().toISOString(),
    step: 'CLI_DISPATCH',
    message: `[图${index}] 调度 Antigravity CLI 独立无头进程 (agy -p)${tempRefPath ? ' [图生图模式]' : ''}`,
    status: 'info'
  });

  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';

    const proc = exec(command, { timeout: CLI_TIMEOUT_MS }, (error) => {
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

      // 1. Direct Regex match from stdout for explicitly printed image path
      const match = stdoutData.match(/Generated image is saved at\s+([^\s]+\.(?:jpg|png|webp|jpeg))/i);
      if (match && fs.existsSync(match[1]) && !path.basename(match[1]).startsWith('ref_')) {
        const filePath = match[1];
        logs.push({
          timestamp: new Date().toISOString(),
          step: 'IMAGE_MATCH_STDOUT',
          message: `[图${index}] 从 CLI 输出中精准捕获产物: ${path.basename(filePath)}`,
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

      // 2. Extract specific Conversation ID from stdout/stderr to isolate session
      const convIdMatch = (stdoutData + stderrData).match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (convIdMatch) {
        matchedConvId = convIdMatch[1];
      }

      // 3. Scan and strictly verify candidate conversation directories
      try {
        if (fs.existsSync(BRAIN_DIR)) {
          const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

          // List candidates: ONLY valid UUID conversation directories (exclude .tempmediaStorage and hidden folders)
          const candidateConvs = fs.readdirSync(BRAIN_DIR).map(name => {
            if (!UUID_REGEX.test(name)) return null;
            const fullPath = path.join(BRAIN_DIR, name);
            try {
              return { 
                name, 
                path: fullPath, 
                stat: fs.statSync(fullPath),
                isNew: !preExistingConvs.has(name)
              };
            } catch {
              return null;
            }
          }).filter((item): item is { name: string; path: string; stat: fs.Stats; isNew: boolean } => 
            item !== null && item.stat.isDirectory() && (item.isNew || item.stat.mtimeMs >= beforeTime)
          ).sort((a, b) => {
            // Prioritize explicitly matched convId, then newly created convs, then mtime
            if (matchedConvId && a.name === matchedConvId) return -1;
            if (matchedConvId && b.name === matchedConvId) return 1;
            if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
            return b.stat.mtimeMs - a.stat.mtimeMs;
          });

          for (const cand of candidateConvs) {
            const transcriptPath = path.join(cand.path, '.system_generated', 'logs', 'transcript.jsonl');
            if (fs.existsSync(transcriptPath)) {
              try {
                const transcriptContent = fs.readFileSync(transcriptPath, 'utf-8');
                
                // CRUCIAL: Verify prompt signature to prevent stealing another frame's image!
                const verification = verifyTranscriptPromptMatch(transcriptContent, promptKeywords);
                if (!verification.matched && candidateConvs.length > 1) {
                  logs.push({
                    timestamp: new Date().toISOString(),
                    step: 'CONV_SIGNATURE_MISMATCH',
                    message: `[图${index}] 排除会话 ${cand.name.slice(0, 8)}: Prompt 特征不吻合 (命中: [${verification.matchedWords.join(', ')}])`,
                    status: 'info'
                  });
                  continue;
                }

                // Check image explicitly recorded in transcript
                const pathInTranscript = transcriptContent.match(/Generated image is saved at\s+([^\s]+\.(?:jpg|png|webp|jpeg))/i);
                if (pathInTranscript && fs.existsSync(pathInTranscript[1]) && !path.basename(pathInTranscript[1]).startsWith('ref_')) {
                  const filePath = pathInTranscript[1];
                  logs.push({
                    timestamp: new Date().toISOString(),
                    step: 'IMAGE_MATCH_TRANSCRIPT',
                    message: `[图${index}] 经特征签名验证，确认专属产物: ${path.basename(filePath)} (会话: ${cand.name.slice(0, 8)})`,
                    status: 'success',
                    elapsedMs
                  });
                  const buf = fs.readFileSync(filePath);
                  return resolve({
                    imageUrl: `data:image/jpeg;base64,${buf.toString('base64')}`,
                    convId: cand.name,
                    logs,
                    stdoutData,
                    stderrData
                  });
                }

                // Check model feedback in transcript for explicit errors
                const lines = transcriptContent.trim().split('\n');
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
              } catch {
                // skip
              }
            }

            // Check image file in candidate dir root (exclude reference images)
            try {
              const files = fs.readdirSync(cand.path);
              for (const file of files) {
                const lower = file.toLowerCase();
                if (lower.startsWith('ref_') || lower.startsWith('.')) continue;
                if (lower.endsWith('.jpg') || lower.endsWith('.png') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
                  const filePath = path.join(cand.path, file);
                  const stat = fs.statSync(filePath);
                  if (stat.mtimeMs >= beforeTime) {
                    logs.push({
                      timestamp: new Date().toISOString(),
                      step: 'IMAGE_MATCH_SCAN',
                      message: `[图${index}] 捕获会话专属渲染产物: ${file} (会话: ${cand.name.slice(0, 8)})`,
                      status: 'success',
                      elapsedMs
                    });
                    const buf = fs.readFileSync(filePath);
                    return resolve({
                      imageUrl: `data:image/jpeg;base64,${buf.toString('base64')}`,
                      convId: cand.name,
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
          }
        }
      } catch {
        // ignore scan errors
      }

      // 4. Construct specific diagnostic advice if no image was produced
      if (modelFeedback) {
        if (
          modelFeedback.includes('429') ||
          modelFeedback.includes('RESOURCE_EXHAUSTED') ||
          modelFeedback.includes('配额') ||
          modelFeedback.includes('Too Many Requests')
        ) {
          diagnosticAdvice = '上游生图模型配额超限 (429 Too Many Requests / RESOURCE_EXHAUSTED)。预计在稍后自动恢复。';
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
        const isTimeout = error && (error.killed || (error as any).signal === 'SIGTERM' || elapsedMs >= CLI_TIMEOUT_MS - 2000);
        if (isTimeout) {
          diagnosticAdvice = `生成超时：上游生图模型排队或网络响应较长(${(CLI_TIMEOUT_MS / 1000).toFixed(0)}s)，本次会话未产出独立图片。`;
        } else {
          diagnosticAdvice = '未在预期时间内捕获到当前分镜的专属图片产物，已严格阻断跨会话复用。请点击重试生成。';
        }
        logs.push({
          timestamp: new Date().toISOString(),
          step: 'CLI_NO_OUTPUT',
          message: `[图${index}] ${diagnosticAdvice}`,
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
 * Public function to execute single image CLI (enqueued to prevent concurrency issues)
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
  return enqueueRenderJob(() => executeSingleImageCliInternal(refinedPrompt, index, referenceImageUrl));
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

  // Step 1: Semantic Purification (preserving pre-compiled English prompts)
  let refinedPrompt = prompt.trim();
  if (!refinedPrompt.includes('masterpiece') && !refinedPrompt.includes('best quality') && !refinedPrompt.includes('featuring the character')) {
    refinedPrompt = translateAndRefineChinesePrompt(prompt);
  }
  if (!refinedPrompt.includes('no split screen')) {
    refinedPrompt += ', single standalone image, single frame, no split screen, no grid, no multi-panel, no comic strip, no speech bubbles, no text';
  }

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
    diagnosticAdvice: detectedAdvice || (isSuccess ? undefined : '建议稍后重试，或检查网络连接。'),
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
