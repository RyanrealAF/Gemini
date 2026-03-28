import { config } from 'dotenv';
config();

import '@/ai/flows/configure-ai-parameters-flow.ts';
import '@/ai/flows/receive-batch-ai-response.ts';
import '@/ai/flows/stream-ai-response.ts';