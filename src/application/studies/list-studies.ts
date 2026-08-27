import type { Study } from '../../domain/study/study';
import type { StudyRepository } from './study-repository';

export class ListStudies {
  public constructor(private readonly studyRepository: StudyRepository) {}

  public execute(): Promise<readonly Study[]> {
    return this.studyRepository.list();
  }
}
