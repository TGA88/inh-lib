
// src/internal/otel-instrumentation-manager.ts

import { OtelInstrumentationInstance } from '../types';

export class OtelInstrumentationManager {
  readonly instrumentations: Map<string, OtelInstrumentationInstance> = new Map();

  registerInstrumentation(name: string, instrumentation: unknown): void {
    this.instrumentations.set(name, {
      name,
      instrumentation,
      isEnabled: true
    });
  }

  getInstrumentation(name: string): OtelInstrumentationInstance | undefined {
    return this.instrumentations.get(name);
  }

  getAllInstrumentations(): Map<string, OtelInstrumentationInstance> {
    return new Map(this.instrumentations);
  }

  enableInstrumentation(name: string): void {
    const inst = this.instrumentations.get(name);
    if (inst) {
      this.instrumentations.set(name, { ...inst, isEnabled: true });
      
      if (inst.instrumentation && typeof (inst.instrumentation as any).enable === 'function') {
        (inst.instrumentation as any).enable();
      }
    }
  }

  disableInstrumentation(name: string): void {
    const inst = this.instrumentations.get(name);
    if (inst) {
      this.instrumentations.set(name, { ...inst, isEnabled: false });
      
      if (inst.instrumentation && typeof (inst.instrumentation as any).disable === 'function') {
        (inst.instrumentation as any).disable();
      }
    }
  }

  isInstrumentationEnabled(name: string): boolean {
    const inst = this.instrumentations.get(name);
    return inst?.isEnabled || false;
  }

  getEnabledInstrumentations(): OtelInstrumentationInstance[] {
    return Array.from(this.instrumentations.values()).filter(inst => inst.isEnabled);
  }

  getDisabledInstrumentations(): OtelInstrumentationInstance[] {
    return Array.from(this.instrumentations.values()).filter(inst => !inst.isEnabled);
  }

  clear(): void {
    this.instrumentations.clear();
  }
}
