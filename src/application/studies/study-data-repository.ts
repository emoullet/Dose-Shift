import type { EntityId } from '../../domain/common/identity';
import type { StudyData } from '../../domain/study/study-data';

export interface StudyDataRepository {
  getByStudyId(studyId: EntityId): Promise<StudyData | undefined>;
  /** Upserts supplied records without deleting study records omitted from this snapshot. */
  save(studyData: StudyData): Promise<void>;
  /** Replaces all local study data from an authoritative complete backup. */
  restoreBackup(studyData: readonly StudyData[]): Promise<void>;
}
