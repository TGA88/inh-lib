import { createResourceTracker } from "../internal/logic/resource-tracker.logic";
import { UnifiedResourceMeasurement, UnifiedStopResourceMeasurementResult } from "../types/resource-tracking.types";

const resourceTracker = createResourceTracker();

export class ResourceTrackingService {
    static startTracking(): UnifiedResourceMeasurement {
        return resourceTracker.startTracking();
    }

    static stopTracking(startMeasurement: UnifiedResourceMeasurement): UnifiedStopResourceMeasurementResult {
        const result = resourceTracker.stopTracking(startMeasurement);
        // Map the result to UnifiedResourceMeasurement structure
        return result as UnifiedStopResourceMeasurementResult;
    }
}

