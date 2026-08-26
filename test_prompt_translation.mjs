import { compileDiffusionPrompt, translateToEnglishPrompt } from './src/lib/i18n/promptTranslator.js';

const zhPrompt = '戴草帽开拖拉机的柴犬农场主，穿蓝色背带裤，金黄色毛发';
const en = translateToEnglishPrompt(zhPrompt);
console.log('Original ZH:', zhPrompt);
console.log('Translated EN:', en);
