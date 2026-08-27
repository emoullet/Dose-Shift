import type { EntityId } from '../../domain/common/identity';
import type { StudyData } from '../../domain/study/study-data';

export interface StudyDataRepository {
  getByStudyId(studyId: EntityId): Promise<StudyData | undefined>;
  save(studyData: StudyData): Promise<void>;
}
