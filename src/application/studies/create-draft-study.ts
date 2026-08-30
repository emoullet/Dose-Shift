import type { EntityId } from '../../domain/common/identity';
import type { StudyData } from '../../domain/study/study-data';
import { buildDraftStudyData, type DraftStudyInput } from './build-draft-study-data';
import type { StudyDataRepository } from './study-data-repository';
import type { StudyRepository } from './study-repository';

export class ContinuingStudyConflictError extends Error {
  public constructor(public readonly studyIds: readonly EntityId[]) {
    super('A draft or active study already exists');
    this.name = 'ContinuingStudyConflictError';
  }
}

export class CreateDraftStudy {
  public constructor(
    private readonly studyRepository: Pick<StudyRepository, 'list'>,
    private readonly studyDataRepository: StudyDataRepository
  ) {}

  public async execute(input: DraftStudyInput): Promise<StudyData> {
    const continuingStudies = (await this.studyRepository.list())
      .filter(({ status }) => status === 'draft' || status === 'active');
    if (continuingStudies.length > 0) {
      throw new ContinuingStudyConflictError(continuingStudies.map(({ id }) => id));
    }

    const draft = buildDraftStudyData(input);
    const result = await this.studyDataRepository.createDraftIfNoContinuingStudy(draft);
    if (!result.created) {
      throw new ContinuingStudyConflictError(result.existingStudyIds);
    }

    return draft;
  }
}
