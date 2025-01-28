// lib/main.ts
// ให้ export ถึง direct path เลย แทนการใช้ barral file(index.ts) เพื่อให้ optimization tree-shaking ที่ดีและลดปัญหา export path

export * from './components/router-provider/router-provider';
export * from './components/router/router';

export * from './hooks/use-inh-router-params/use-inh-router-params';
export * from './hooks/use-inh-router-query/use-inh-router-query';  
export * from './hooks/use-inh-navigation/use-inh-navigation';