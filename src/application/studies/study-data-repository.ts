import type { EntityId } from '../../domain/common/identity';
import type { StudyData } from '../../domain/study/study-data';

export type CreateDraftResult =
  | { readonly created: true }
  | { readonly created: false; readonly existingStudyIds: readonly EntityId[] };

export interface StudyDataRepository {
  getByStudyId(studyId: EntityId): Promise<StudyData | undefined>;
  /** Creates a complete draft only when no draft or active study exists. */
  createDraftIfNoContinuingStudy(studyData: StudyData): Promise<CreateDraftResult>;
  /** Upserts supplied records without deleting study records omitted from this snapshot. */
  save(studyData: StudyData): Promise<void>;
  /** Replaces all local study data from an authoritative complete backup. */
  restoreBackup(studyData: readonly StudyData[]): Promise<void>;
}
