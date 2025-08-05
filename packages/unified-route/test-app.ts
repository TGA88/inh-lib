// Simple test for unified app
import { createUnifiedApp } from './src/logic/unified-app.logic';

const app = createUnifiedApp();

app.get('/test', (context) => {
  context.response.json({ message: 'Hello World' });
});

console.log('App created successfully!');
