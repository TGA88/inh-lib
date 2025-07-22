
// src/internal/otel-exporter-manager.ts

import { OtelExporterInstance } from '../types';

export class OtelExporterManager {
  readonly exporters: Map<string, OtelExporterInstance> = new Map();

  registerExporter(name: string, exporter: unknown, type: string): void {
    this.exporters.set(name, {
      type,
      exporter,
      isInitialized: true
    });
  }

  getExporter(name: string): OtelExporterInstance | undefined {
    return this.exporters.get(name);
  }

  getAllExporters(): Map<string, OtelExporterInstance> {
    return new Map(this.exporters);
  }

  isExporterRegistered(name: string): boolean {
    return this.exporters.has(name);
  }

  getExportersByType(type: string): OtelExporterInstance[] {
    return Array.from(this.exporters.values()).filter(exp => exp.type === type);
  }

  async shutdownExporter(name: string): Promise<void> {
    const exporterInstance = this.exporters.get(name);
    if (!exporterInstance) {
      return;
    }

    if (exporterInstance.exporter && typeof (exporterInstance.exporter as any).shutdown === 'function') {
      await (exporterInstance.exporter as any).shutdown();
    }

    this.exporters.delete(name);
  }

  async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.exporters.keys()).map(name => 
      this.shutdownExporter(name)
    );
    
    await Promise.all(shutdownPromises);
  }

  clear(): void {
    this.exporters.clear();
  }
}
