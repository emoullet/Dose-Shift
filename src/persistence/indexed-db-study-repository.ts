import type { StudyRepository } from '../application/studies/study-repository';
import type { EntityId } from '../domain/common/identity';
import { type Study, studySchema } from '../domain/study/study';
import { getDatabase } from './database';

export class IndexedDbStudyRepository implements StudyRepository {
  public async getById(id: EntityId): Promise<Study | undefined> {
    const database = await getDatabase();
    const storedValue: unknown = await database.get('studies', id);
    return storedValue === undefined ? undefined : studySchema.parse(storedValue);
  }

  public async list(): Promise<readonly Study[]> {
    const database = await getDatabase();
    const storedValues: unknown[] = await database.getAllFromIndex('studies', 'by-created-at');
    return storedValues.map((value) => studySchema.parse(value));
  }

  public async save(study: Study): Promise<void> {
    const validatedStudy = studySchema.parse(study);
    const database = await getDatabase();
    await database.put('studies', validatedStudy);
  }
}
