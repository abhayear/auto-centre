"use client";

import { getRoleTemplateConfig, hasRoleScreening } from "@/lib/job-role-evaluation";

type RoleScreeningPreviewProps = {
  roleTemplate: string;
};

export function RoleScreeningPreview({ roleTemplate }: RoleScreeningPreviewProps) {
  if (!hasRoleScreening(roleTemplate)) return null;

  const config = getRoleTemplateConfig(roleTemplate);
  if (!config) return null;

  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4 text-sm">
      <p className="font-medium text-amber-200">{config.screeningTitle}</p>
      <p className="mt-1 text-xs text-slate-400">{config.screeningDescription}</p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs text-slate-300">
        {config.screeningQuestions.map((question) => (
          <li key={question.id}>
            {question.label}
            {question.required === false && (
              <span className="text-slate-500"> (optional)</span>
            )}
          </li>
        ))}
        <li className="text-slate-400">Additional notes (optional)</li>
      </ol>
      <p className="mt-3 text-xs text-slate-500">
        Admin rates applicants on {config.evaluationCriteria.length} criteria (1–5 scale) in
        Applicant Tracking.
      </p>
    </div>
  );
}
