import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type { AppDependencies } from '../../app/app';
import {
  buildDraftStudyData,
  defaultPhaseDurationDays
} from '../../application/studies/build-draft-study-data';
import {
  ContinuingStudyConflictError,
  CreateDraftStudy
} from '../../application/studies/create-draft-study';
import { LoadContinuingStudy } from '../../application/studies/load-continuing-study';
import { UpdateDraftStudy } from '../../application/studies/update-draft-study';
import { calendarDaysBetween } from '../../domain/common/calendar';
import {
  localDateForInstant,
  localDateSchema,
  nowAsInstant,
  timeZoneSchema,
  type LocalDate
} from '../../domain/common/time';
import type { StudyData } from '../../domain/study/study-data';

type WorkspaceState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'study'; readonly data: StudyData; readonly message: 'resumed' | 'saved' | 'updated' | 'conflict' }
  | { readonly kind: 'loadError' };

interface FormErrors {
  readonly startDate?: true;
  readonly timeZone?: true;
  readonly duration?: true;
  readonly timeZoneConfirmation?: true;
}

export function HomeScreen({ dependencies }: { dependencies: AppDependencies }) {
  const { t } = useTranslation();
  const [workspace, setWorkspace] = useState<WorkspaceState>({ kind: 'loading' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let current = true;
    const loader = new LoadContinuingStudy(
      dependencies.studyRepository,
      dependencies.studyDataRepository
    );
    void loader.execute()
      .then((data) => {
        if (current) {
          setWorkspace(data === undefined
            ? { kind: 'empty' }
            : { kind: 'study', data, message: 'resumed' });
        }
      })
      .catch(() => {
        if (current) {
          setWorkspace({ kind: 'loadError' });
        }
      });
    return () => {
      current = false;
    };
  }, [dependencies]);

  return (
    <section className="screen-stack">
      <div className="hero-card">
        <p className="eyebrow">{t('app.tagline')}</p>
        <h1>{t('home.heading')}</h1>
        <p>{t('home.introduction')}</p>
      </div>

      {workspace.kind === 'loading' && <p role="status">{t('studySetup.loading')}</p>}
      {workspace.kind === 'loadError' && (
        <div className="error-message" role="alert">{t('studySetup.loadError')}</div>
      )}
      {workspace.kind === 'empty' && !showForm && (
        <section className="info-card" aria-labelledby="empty-study-heading">
          <h2 id="empty-study-heading">{t('studySetup.emptyTitle')}</h2>
          <p>{t('studySetup.emptyDescription')}</p>
          <button className="primary-button" type="button" onClick={() => setShowForm(true)}>
            {t('studySetup.createAction')}
          </button>
        </section>
      )}
      {workspace.kind === 'empty' && showForm && (
        <DraftStudyForm
          dependencies={dependencies}
          onSaved={(data) => {
            setWorkspace({ kind: 'study', data, message: 'saved' });
            setShowForm(false);
          }}
          onConflict={(data) => {
            setWorkspace({ kind: 'study', data, message: 'conflict' });
            setShowForm(false);
          }}
        />
      )}
      {workspace.kind === 'study' && (
        showForm ? (
          <DraftStudyForm
            dependencies={dependencies}
            initialData={workspace.data}
            onSaved={(data) => {
              setWorkspace({ kind: 'study', data, message: 'updated' });
              setShowForm(false);
            }}
            onConflict={(data) => {
              setWorkspace({ kind: 'study', data, message: 'conflict' });
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <>
            <p className="success-message" role="status">
              {t(`studySetup.${workspace.message}`)}
            </p>
            <StudyPlan
              data={workspace.data}
              onEdit={workspace.data.study.status === 'draft' &&
                workspace.data.study.protocolVersion === '1.1'
                ? () => setShowForm(true)
                : undefined}
            />
          </>
        )
      )}
    </section>
  );
}

function DraftStudyForm({
  dependencies,
  initialData,
  onSaved,
  onConflict,
  onCancel
}: {
  readonly dependencies: AppDependencies;
  readonly initialData?: StudyData;
  readonly onSaved: (data: StudyData) => void;
  readonly onConflict: (data: StudyData) => void;
  readonly onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const editing = initialData !== undefined;
  const detectedTimeZone = getDetectedTimeZone();
  const [startDate, setStartDate] = useState(() =>
    initialData?.study.startDate ?? getInitialStartDate(detectedTimeZone));
  const [timeZone, setTimeZone] = useState(initialData?.study.timeZone ?? detectedTimeZone);
  const [duration, setDuration] = useState(() => String(
    initialData === undefined ? defaultPhaseDurationDays : getPhaseDuration(initialData)
  ));
  const [timeZoneConfirmed, setTimeZoneConfirmed] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submission, setSubmission] = useState<'idle' | 'saving' | 'failed'>('idle');
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const preview = useMemo(() => {
    const parsedDate = localDateSchema.safeParse(startDate);
    const parsedTimeZone = timeZoneSchema.safeParse(timeZone);
    const phaseDurationDays = Number(duration);
    if (!parsedDate.success || !parsedTimeZone.success || !Number.isInteger(phaseDurationDays) ||
      phaseDurationDays < 1 || phaseDurationDays > 90) {
      return undefined;
    }
    return buildDraftStudyData({
      a1StartDate: parsedDate.data,
      timeZone: parsedTimeZone.data,
      phaseDurationDays
    });
  }, [duration, startDate, timeZone]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const parsedDate = localDateSchema.safeParse(startDate);
    const parsedTimeZone = timeZoneSchema.safeParse(timeZone);
    const phaseDurationDays = Number(duration);
    const nextErrors: FormErrors = {
      ...(!parsedDate.success && { startDate: true }),
      ...(!parsedTimeZone.success && { timeZone: true }),
      ...((!Number.isInteger(phaseDurationDays) || phaseDurationDays < 1 ||
        phaseDurationDays > 90) && { duration: true }),
      ...(!timeZoneConfirmed && { timeZoneConfirmation: true })
    };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !parsedDate.success || !parsedTimeZone.success) {
      queueMicrotask(() => errorSummaryRef.current?.focus());
      return;
    }

    setSubmission('saving');
    try {
      const input = {
        a1StartDate: parsedDate.data,
        timeZone: parsedTimeZone.data,
        phaseDurationDays
      };
      const data = initialData === undefined
        ? await new CreateDraftStudy(
          dependencies.studyRepository,
          dependencies.studyDataRepository
        ).execute(input)
        : await new UpdateDraftStudy(dependencies.studyDataRepository)
          .execute(initialData.study.id, input);
      onSaved(data);
    } catch (error) {
      if (error instanceof ContinuingStudyConflictError) {
        try {
          const existing = await new LoadContinuingStudy(
            dependencies.studyRepository,
            dependencies.studyDataRepository
          ).execute();
          if (existing !== undefined) {
            onConflict(existing);
            return;
          }
        } catch {
          // The localized persistence error below covers an unsafe or incomplete resume state.
        }
      }
      setSubmission('failed');
      queueMicrotask(() => errorSummaryRef.current?.focus());
    }
  }

  return (
    <section className="setup-layout" aria-labelledby="study-setup-heading">
      <div className="info-card">
        <h2 id="study-setup-heading">
          {t(editing ? 'studySetup.editFormTitle' : 'studySetup.formTitle')}
        </h2>
        {(Object.keys(errors).length > 0 || submission === 'failed') && (
          <div className="error-message" role="alert" tabIndex={-1} ref={errorSummaryRef}>
            {submission === 'failed'
              ? t('studySetup.persistenceError')
              : t('studySetup.validationSummary')}
          </div>
        )}
        <form noValidate onSubmit={(event) => void handleSubmit(event)}>
          <fieldset>
            <legend>{t('studySetup.planDetails')}</legend>
            <div className="field-group">
              <label htmlFor="a1-start-date">{t('studySetup.startDate')}</label>
              <input
                id="a1-start-date"
                type="date"
                value={startDate}
                aria-invalid={errors.startDate === true}
                aria-describedby={`start-date-help${errors.startDate ? ' start-date-error' : ''}`}
                onChange={(event) => setStartDate(event.target.value)}
              />
              <p className="field-help" id="start-date-help">{t('studySetup.startDateHelp')}</p>
              {errors.startDate && <p className="field-error" id="start-date-error">{t('studySetup.startDateError')}</p>}
            </div>

            <div className="field-group">
              <label htmlFor="phase-duration">{t('studySetup.duration')}</label>
              <input
                id="phase-duration"
                type="number"
                inputMode="numeric"
                min="1"
                max="90"
                step="1"
                value={duration}
                aria-invalid={errors.duration === true}
                aria-describedby={`duration-help${errors.duration ? ' duration-error' : ''}`}
                onChange={(event) => setDuration(event.target.value)}
              />
              <p className="field-help" id="duration-help">{t('studySetup.durationHelp')}</p>
              {errors.duration && <p className="field-error" id="duration-error">{t('studySetup.durationError')}</p>}
            </div>

            <div className="field-group">
              <label htmlFor="study-time-zone">{t('studySetup.timeZone')}</label>
              <input
                id="study-time-zone"
                type="text"
                value={timeZone}
                spellCheck={false}
                autoCapitalize="none"
                aria-invalid={errors.timeZone === true}
                aria-describedby={`time-zone-help${errors.timeZone ? ' time-zone-error' : ''}`}
                onChange={(event) => {
                  setTimeZone(event.target.value);
                  setTimeZoneConfirmed(false);
                }}
              />
              <p className="field-help" id="time-zone-help">{t('studySetup.timeZoneHelp')}</p>
              {errors.timeZone && <p className="field-error" id="time-zone-error">{t('studySetup.timeZoneError')}</p>}
            </div>

            <div className="checkbox-field">
              <input
                id="confirm-time-zone"
                type="checkbox"
                checked={timeZoneConfirmed}
                aria-invalid={errors.timeZoneConfirmation === true}
                aria-describedby={errors.timeZoneConfirmation ? 'time-zone-confirmation-error' : undefined}
                onChange={(event) => setTimeZoneConfirmed(event.target.checked)}
              />
              <label htmlFor="confirm-time-zone">{t('studySetup.timeZoneConfirmation', { timeZone })}</label>
            </div>
            {errors.timeZoneConfirmation && (
              <p className="field-error" id="time-zone-confirmation-error">
                {t('studySetup.timeZoneConfirmationError')}
              </p>
            )}
          </fieldset>

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={submission === 'saving'}>
              {submission === 'saving'
                ? t('studySetup.saving')
                : t(editing ? 'studySetup.saveChanges' : 'studySetup.saveDraft')}
            </button>
            {onCancel !== undefined && (
              <button className="secondary-button" type="button" onClick={onCancel}>
                {t('studySetup.cancelEdit')}
              </button>
            )}
          </div>
        </form>
      </div>

      {preview !== undefined && <StudyPlan data={preview} preview />}
    </section>
  );
}

function StudyPlan({
  data,
  preview = false,
  onEdit
}: {
  readonly data: StudyData;
  readonly preview?: boolean;
  readonly onEdit?: (() => void) | undefined;
}) {
  const { i18n, t } = useTranslation();
  const locale = i18n.resolvedLanguage === 'fr' ? 'fr-FR' : 'en-GB';
  const orderedPhases = [...data.protocolPhases].sort((left, right) =>
    left.sequenceOrder - right.sequenceOrder);
  const duration = orderedPhases[0] === undefined
    ? 0
    : calendarDaysBetween(orderedPhases[0].startDate, orderedPhases[0].endDate) + 1;

  return (
    <div className="plan-stack">
      <section className="info-card" aria-labelledby={preview ? 'preview-heading' : 'saved-plan-heading'}>
        <div className="plan-heading-row">
          <h2 id={preview ? 'preview-heading' : 'saved-plan-heading'}>
            {preview ? t('studySetup.previewTitle') : t('studySetup.savedPlanTitle')}
          </h2>
          <span className="status-badge">{t(`studySetup.status.${data.study.status}`)}</span>
        </div>
        {onEdit !== undefined && (
          <button className="secondary-button edit-plan-button" type="button" onClick={onEdit}>
            {t('studySetup.editDraft')}
          </button>
        )}
        <p>{t('studySetup.protocolVersion', { version: data.study.protocolVersion })}</p>
        <p className="time-zone-value">{t('studySetup.savedTimeZone', { timeZone: data.study.timeZone })}</p>
        {duration !== 7 && (
          <p className="duration-notice" role="status">{t('studySetup.durationNotice')}</p>
        )}
        <div className="phase-list">
          {orderedPhases.map((phase) => (
            <article className={`phase-card phase-${phase.kind.toLowerCase()}`} key={phase.id}>
              <h3>
                {t(`studySetup.phase.${phase.kind}`)}
                {phase.isTransitionStart && (
                  <span className="transition-label"> — {t('studySetup.transitionStart')}</span>
                )}
              </h3>
              <p>
                <time dateTime={phase.startDate}>{formatLocalDate(phase.startDate, locale)}</time>
                {' — '}
                <time dateTime={phase.endDate}>{formatLocalDate(phase.endDate, locale)}</time>
              </p>
              <h4>{t('studySetup.medicationSchedule')}</h4>
              <ul className="schedule-list">
                {phase.medicationSchedule.map((plannedMedication) => (
                  <li key={plannedMedication.id}>
                    <strong>{t(`studySetup.medication.${plannedMedication.medication}`)}</strong>
                    <span>{t('studySetup.doseAndFormulation', {
                      dose: plannedMedication.doseMg,
                      formulation: t(`studySetup.formulation.${plannedMedication.formulation}`)
                    })}</span>
                    <span>{t('studySetup.timeWindow', {
                      start: plannedMedication.timeWindow.startsAt,
                      end: plannedMedication.timeWindow.endsAt
                    })}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="info-card" aria-labelledby="familiarization-heading">
        <h2 id="familiarization-heading">{t('studySetup.familiarizationTitle')}</h2>
        <p>{t('studySetup.familiarizationDescription')}</p>
      </section>

      <aside className="prerequisite-notice" aria-labelledby="prerequisite-heading">
        <h2 id="prerequisite-heading">{t('studySetup.prerequisiteTitle')}</h2>
        <p>{t('studySetup.prerequisiteDescription')}</p>
      </aside>

      <aside className="safety-notice" aria-labelledby="precautions-heading">
        <h2 id="precautions-heading">{t('studySetup.precautionsTitle')}</h2>
        <p>{t('studySetup.precautionsDescription')}</p>
        <p>{t('studySetup.stopCondition')}</p>
        <p>{t('home.safetyNotice')}</p>
      </aside>
    </div>
  );
}

function getDetectedTimeZone(): string {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timeZoneSchema.safeParse(detected).success ? detected : '';
}

function getInitialStartDate(timeZone: string): string {
  const parsedTimeZone = timeZoneSchema.safeParse(timeZone);
  return parsedTimeZone.success
    ? localDateForInstant(nowAsInstant(), parsedTimeZone.data)
    : '';
}

function getPhaseDuration(data: StudyData): number {
  const a1 = data.protocolPhases.find(({ kind }) => kind === 'A1');
  return a1 === undefined
    ? defaultPhaseDurationDays
    : calendarDaysBetween(a1.startDate, a1.endDate) + 1;
}

function formatLocalDate(localDate: LocalDate, locale: string): string {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year!, month! - 1, day!)));
}
