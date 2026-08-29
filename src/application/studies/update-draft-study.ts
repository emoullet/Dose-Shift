import { createEntityId, type EntityId } from '../../domain/common/identity';
import { nowAsInstant, type Instant } from '../../domain/common/time';
import { studyDataSchema, type StudyData } from '../../domain/study/study-data';
import {
  buildDraftStudyData,
  canonicalProtocolVersion,
  type DraftStudyBuilderDependencies,
  type DraftStudyInput
} from './build-draft-study-data';
import type { StudyDataRepository } from './study-data-repository';

export class DraftStudyNotEditableError extends Error {
  public constructor() {
    super('Only a draft study can be edited');
    this.name = 'DraftStudyNotEditableError';
  }
}

export class DraftStudyNotFoundError extends Error {
  public constructor() {
    super('The draft study could not be found');
    this.name = 'DraftStudyNotFoundError';
  }
}

export class DraftStudyProtocolError extends Error {
  public constructor() {
    super('Only a canonical protocol 1.1 draft can be edited');
    this.name = 'DraftStudyProtocolError';
  }
}

export interface UpdateDraftStudyDependencies {
  readonly now: () => Instant;
}

const defaultDependencies: UpdateDraftStudyDependencies = {
  now: nowAsInstant
};

export function updateDraftStudyData(
  existingStudyData: StudyData,
  input: DraftStudyInput,
  dependencies: UpdateDraftStudyDependencies = defaultDependencies
): StudyData {
  const existing = studyDataSchema.parse(existingStudyData);
  if (existing.study.status !== 'draft') {
    throw new DraftStudyNotEditableError();
  }
  if (existing.study.protocolVersion !== canonicalProtocolVersion) {
    throw new DraftStudyProtocolError();
  }

  const timestamp = dependencies.now();
  const planDependencies: DraftStudyBuilderDependencies = {
    createId: createEntityId,
    now: () => timestamp
  };
  const proposed = buildDraftStudyData(input, planDependencies);
  const protocolPhases = proposed.protocolPhases.map((phase) => {
    const existingPhase = existing.protocolPhases.find(({ kind }) => kind === phase.kind);
    if (existingPhase === undefined) {
      throw new Error(`The draft is missing its ${phase.kind} protocol phase`);
    }

    return {
      ...phase,
      id: existingPhase.id,
      studyId: existing.study.id,
      medicationSchedule: phase.medicationSchedule.map((medication) => {
        const existingMedication = existingPhase.medicationSchedule.find(
          ({ medication: identifier }) => identifier === medication.medication
        );
        if (existingMedication === undefined) {
          throw new Error(`The ${phase.kind} phase is missing its ${medication.medication} schedule`);
        }
        return { ...medication, id: existingMedication.id };
      })
    };
  });

  return studyDataSchema.parse({
    ...existing,
    study: {
      ...existing.study,
      startDate: proposed.study.startDate,
      timeZone: proposed.study.timeZone,
      updatedAt: timestamp
    },
    protocolPhases
  });
}

export class UpdateDraftStudy {
  public constructor(
    private readonly repository: Pick<StudyDataRepository, 'getByStudyId' | 'save'>
  ) {}

  public async execute(studyId: EntityId, input: DraftStudyInput): Promise<StudyData> {
    const existing = await this.repository.getByStudyId(studyId);
    if (existing === undefined) {
      throw new DraftStudyNotFoundError();
    }
    const updated = updateDraftStudyData(existing, input);
    await this.repository.save(updated);
    return updated;
  }
}
