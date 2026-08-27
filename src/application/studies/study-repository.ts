import type { EntityId } from '../../domain/common/identity';
import type { Study } from '../../domain/study/study';

export interface StudyRepository {
  getById(id: EntityId): Promise<Study | undefined>;
  list(): Promise<readonly Study[]>;
  save(study: Study): Promise<void>;
}
