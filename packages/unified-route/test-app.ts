// Simple test for unified app
import { createUnifiedApp } from './src/logic/unified-app.logic';
import type { UnifiedHttpContext } from './src/types/unified-context';

const app = createUnifiedApp();

app.get('/test', async (context: UnifiedHttpContext) => {
  context.response.json({ message: 'Hello World' });
});

console.log('App created successfully!');
