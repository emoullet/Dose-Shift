import type { EntityId } from '../../domain/common/identity';
import type { StudyData } from '../../domain/study/study-data';
import type { StudyDataRepository } from './study-data-repository';
import type { StudyRepository } from './study-repository';

export class MultipleContinuingStudiesError extends Error {
  public constructor(public readonly studyIds: readonly EntityId[]) {
    super('Multiple draft or active studies exist');
    this.name = 'MultipleContinuingStudiesError';
  }
}

export class IncompleteContinuingStudyError extends Error {
  public constructor(public readonly studyId: EntityId) {
    super('The continuing study is missing its aggregate data');
    this.name = 'IncompleteContinuingStudyError';
  }
}

export class LoadContinuingStudy {
  public constructor(
    private readonly studyRepository: Pick<StudyRepository, 'list'>,
    private readonly studyDataRepository: Pick<StudyDataRepository, 'getByStudyId'>
  ) {}

  public async execute(): Promise<StudyData | undefined> {
    const continuingStudies = (await this.studyRepository.list())
      .filter(({ status }) => status === 'draft' || status === 'active');
    if (continuingStudies.length === 0) {
      return undefined;
    }
    if (continuingStudies.length > 1) {
      throw new MultipleContinuingStudiesError(continuingStudies.map(({ id }) => id));
    }

    const studyId = continuingStudies[0]!.id;
    const data = await this.studyDataRepository.getByStudyId(studyId);
    if (data === undefined) {
      throw new IncompleteContinuingStudyError(studyId);
    }
    return data;
  }
}
