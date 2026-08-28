import type { DBSchema } from 'idb';

import type { AnalysisAnnotation } from '../domain/analysis/analysis-annotation';
import type { AuditEntry } from '../domain/audit/audit-entry';
import type {
  AdditionalMedicationIntake,
  AlcoholIntake,
  CaffeineIntake
} from '../domain/confounders/confounder-events';
import type { EntityId } from '../domain/common/identity';
import type { AssociativeMemorySession } from '../domain/measurements/associative-memory-session';
import type { CatheterizationEvent } from '../domain/measurements/catheterization-event';
import type { CognitiveMeasurement } from '../domain/measurements/cognitive-measurement';
import type { DailyContext } from '../domain/measurements/daily-context';
import type { NightObservation } from '../domain/measurements/night-observation';
import type { PvtSession } from '../domain/measurements/pvt-session';
import type { CognitiveTestConfiguration } from '../domain/study/cognitive-test-configuration';
import type { MedicationIntake } from '../domain/study/medication-intake';
import type { ProtocolPhase } from '../domain/study/protocol-phase';
import type { Study } from '../domain/study/study';

export interface DoseShiftDatabase extends DBSchema {
  studies: {
    key: EntityId;
    value: Study;
    indexes: { 'by-created-at': string };
  };
  cognitiveTestConfigurations: StudyScopedStore<CognitiveTestConfiguration>;
  protocolPhases: {
    key: EntityId;
    value: ProtocolPhase;
    indexes: {
      'by-study-id': EntityId;
      'by-study-sequence': [EntityId, number];
    };
  };
  medicationIntakes: StudyScopedStore<MedicationIntake>;
  cognitiveMeasurements: StudyScopedStore<CognitiveMeasurement>;
  pvtSessions: StudyScopedStore<PvtSession>;
  associativeMemorySessions: StudyScopedStore<AssociativeMemorySession>;
  catheterizationEvents: StudyScopedStore<CatheterizationEvent>;
  nightObservations: StudyScopedStore<NightObservation>;
  dailyContexts: StudyScopedStore<DailyContext>;
  caffeineIntakes: StudyScopedStore<CaffeineIntake>;
  alcoholIntakes: StudyScopedStore<AlcoholIntake>;
  additionalMedicationIntakes: StudyScopedStore<AdditionalMedicationIntake>;
  analysisAnnotations: StudyScopedStore<AnalysisAnnotation>;
  auditEntries: StudyScopedStore<AuditEntry>;
}

interface StudyScopedStore<Value> {
  key: EntityId;
  value: Value;
  indexes: { 'by-study-id': EntityId };
}
