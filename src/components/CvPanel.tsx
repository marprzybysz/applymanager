import { useState, useRef, useCallback, useEffect, useMemo, KeyboardEvent } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CvProfile, Offer, ParsedCv } from "../types/app";

type Translations = {
  cvAddBtn: string;
  cvReplaceBtn: string;
  cvEditBtn: string;
  cvDropHere: string;
  cvNoFile: string;
  cvCandidateInfo: string;
  cvName: string;
  cvEmail: string;
  cvPhone: string;
  cvLinkedin: string;
  cvGithub: string;
  cvPortfolio: string;
  cvSummary: string;
  cvExperience: string;
  cvEducation: string;
  cvLanguages: string;
  cvProjects: string;
  cvSkills: string;
  cvSkillsHint: string;
  cvAddSkillPlaceholder: string;
  cvMatchChart: string;
  cvHighMatch: string;
  cvMedMatch: string;
  cvLowMatch: string;
  cvNoMatch: string;
  cvParsing: string;
  cvParseError: string;
  cvNoOffersToMatch: string;
  cvConfidence: string;
  cvPages: string;
  cvPreviewTitle: string;
  cvInfoNotExtracted: string;
  cvMatchedOffersList: string;
  cvMatchedSkills: string;
  cvNoMatchedSkills: string;
};

interface SavedCvMeta {
  id: number;
  title: string;
  skill_count: number | null;
  has_file: boolean;
  created_at: string;
  updated_at: string;
}

interface SavedCv {
  id: number;
  title: string;
  content: string | null;
  profile: CvProfile | null;
  skills: string[];
  has_file: boolean;
  created_at: string;
  updated_at: string;
}

interface CvPanelProps {
  offers: Offer[];
  t: Translations;
}

const MATCH_COLORS = {
  high: "#22c55e",
  med: "#f59e0b",
  low: "#f97316",
  none: "#94a3b8",
};

const PROFILE_FIELDS: Array<{ key: keyof CvProfile; label: keyof Translations; isLink?: boolean }> = [
  { key: "name", label: "cvName" },
  { key: "email", label: "cvEmail", isLink: true },
  { key: "phone", label: "cvPhone" },
  { key: "linkedin", label: "cvLinkedin", isLink: true },
  { key: "github", label: "cvGithub", isLink: true },
  { key: "portfolio", label: "cvPortfolio", isLink: true },
  { key: "summary", label: "cvSummary" },
  { key: "experience", label: "cvExperience" },
  { key: "education", label: "cvEducation" },
  { key: "languages", label: "cvLanguages" },
  { key: "projects", label: "cvProjects" },
];

interface ScoredOffer {
  offer: Offer;
  score: number;
  matchedSkills: string[];
}

function scoreOffers(offers: Offer[], skills: string[]): ScoredOffer[] {
  if (skills.length === 0 || offers.length === 0) return [];
  return offers
    .map((offer) => {
      const text = `${offer.role} ${offer.company} ${offer.notes ?? ""}`.toLowerCase();
      const matchedSkills = skills.filter((s) => text.includes(s.toLowerCase()));
      return { offer, score: matchedSkills.length / skills.length, matchedSkills };
    })
    .sort((a, b) => b.score - a.score);
}

function matchColor(score: number): string {
  if (score >= 0.3) return MATCH_COLORS.high;
  if (score >= 0.1) return MATCH_COLORS.med;
  if (score > 0) return MATCH_COLORS.low;
  return MATCH_COLORS.none;
}

function calculateMatchBuckets(
  offers: Offer[],
  skills: string[],
  labels: { high: string; med: string; low: string; none: string }
) {
  if (skills.length === 0 || offers.length === 0) return [];
  let high = 0, med = 0, low = 0, none = 0;
  for (const offer of offers) {
    const text = `${offer.role} ${offer.company} ${offer.notes ?? ""}`.toLowerCase();
    const ratio = skills.filter((s) => text.includes(s.toLowerCase())).length / skills.length;
    if (ratio >= 0.3) high++;
    else if (ratio >= 0.1) med++;
    else if (ratio > 0) low++;
    else none++;
  }
  return [
    { name: labels.high, value: high, color: MATCH_COLORS.high },
    { name: labels.med, value: med, color: MATCH_COLORS.med },
    { name: labels.low, value: low, color: MATCH_COLORS.low },
    { name: labels.none, value: none, color: MATCH_COLORS.none },
  ].filter((e) => e.value > 0);
}

export function CvPanel({ offers, t }: CvPanelProps) {
  const [savedCvList, setSavedCvList] = useState<SavedCvMeta[]>([]);
  const [activeCv, setActiveCv] = useState<SavedCv | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [parsedCv, setParsedCv] = useState<ParsedCv | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const skillsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/cv")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.cvs) && data.cvs.length > 0) {
          setSavedCvList(data.cvs);
          loadCvFromDb(data.cvs[0].id);
        }
      })
      .catch(() => {});
  }, []);

  function revokeBlobUrl() {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }

  function loadCvFromDb(id: number) {
    revokeBlobUrl();
    fetch(`/api/cv/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.cv) {
          const cv: SavedCv = data.cv;
          setActiveCv(cv);
          setSkills(cv.skills ?? []);
          setParsedCv(
            cv.profile
              ? { pageCount: 0, characters: 0, text: cv.content ?? "", profile: cv.profile }
              : null
          );
          setPreviewSrc(cv.has_file ? `/api/cv/${id}/file` : null);
        }
      })
      .catch(() => {});
  }

  function scheduleSkillsSync(cvId: number, updatedSkills: string[]) {
    if (skillsSaveTimerRef.current) clearTimeout(skillsSaveTimerRef.current);
    skillsSaveTimerRef.current = setTimeout(() => {
      fetch(`/api/cv/${cvId}/skills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: updatedSkills }),
      }).catch(() => {});
    }, 800);
  }

  const loadFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) return;

    revokeBlobUrl();
    const blobUrl = URL.createObjectURL(file);
    blobUrlRef.current = blobUrl;
    setPreviewSrc(blobUrl);
    setParsedCv(null);
    setParseError(null);
    setActiveCv(null);
    setIsLoading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/cv/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setParseError(data.error ?? t.cvParseError);
        return;
      }
      const cv: SavedCv = data.cv;
      const parsed: ParsedCv = data.parsed;
      setActiveCv(cv);
      setParsedCv(parsed);
      setSkills(cv.skills ?? []);
      const meta: SavedCvMeta = {
        id: cv.id,
        title: cv.title,
        skill_count: cv.skills?.length ?? 0,
        has_file: cv.has_file,
        created_at: cv.created_at,
        updated_at: cv.updated_at,
      };
      setSavedCvList((prev) => [meta, ...prev]);
    } catch {
      setParseError(t.cvParseError);
    } finally {
      setIsLoading(false);
    }
  }, [t.cvParseError]);

  async function handleDeleteCv(id: number) {
    await fetch(`/api/cv/${id}`, { method: "DELETE" });
    const remaining = savedCvList.filter((c) => c.id !== id);
    setSavedCvList(remaining);
    if (activeCv?.id === id) {
      setActiveCv(null);
      setParsedCv(null);
      setSkills([]);
      revokeBlobUrl();
      setPreviewSrc(null);
      if (remaining.length > 0) loadCvFromDb(remaining[0].id);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }

  function removeSkill(skill: string) {
    setSkills((prev) => {
      const updated = prev.filter((s) => s !== skill);
      if (activeCv) scheduleSkillsSync(activeCv.id, updated);
      return updated;
    });
  }

  function addSkill() {
    const trimmed = newSkill.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    setSkills((prev) => {
      const updated = [...prev, trimmed];
      if (activeCv) scheduleSkillsSync(activeCv.id, updated);
      return updated;
    });
    setNewSkill("");
  }

  function handleSkillKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addSkill(); }
  }

  const matchData = calculateMatchBuckets(offers, skills, {
    high: t.cvHighMatch, med: t.cvMedMatch, low: t.cvLowMatch, none: t.cvNoMatch,
  });

  const scoredOffers = useMemo(() => scoreOffers(offers, skills), [offers, skills]);

  const profile = parsedCv?.profile ?? activeCv?.profile ?? null;
  const hasCv = profile !== null;

  return (
    <div className="cv-layout">

      {/* ═══ LEFT — CV Manager ═══ */}
      <div
        className={`cv-panel cv-panel--left${isDragOver ? " cv-panel--drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false); }}
        onDrop={handleDrop}
      >
        <div className="cv-panel-toolbar">
          <button
            type="button"
            className="cv-toolbar-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            {hasCv ? t.cvReplaceBtn : t.cvAddBtn}
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFileInput} />
        </div>

        {savedCvList.length === 0 && !isLoading ? (
          <div
            className="cv-drop-zone"
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            <span className="cv-drop-icon">📄</span>
            <span className="cv-drop-label">{t.cvDropHere}</span>
          </div>
        ) : (
          <div className="cv-saved-list">
            {savedCvList.map((cv) => (
              <div
                key={cv.id}
                className={`cv-saved-item${activeCv?.id === cv.id ? " cv-saved-item--active" : ""}`}
              >
                <button
                  type="button"
                  className="cv-saved-item-btn"
                  onClick={() => loadCvFromDb(cv.id)}
                >
                  <span className="cv-saved-item-title">{cv.title}</span>
                  <span className="cv-saved-item-meta">{cv.skill_count ?? 0} umiejętności</span>
                </button>
                <button
                  type="button"
                  className="cv-saved-item-delete"
                  onClick={() => handleDeleteCv(cv.id)}
                  aria-label="Usuń CV"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="cv-loading-overlay">
            <span className="cv-loading-spinner" />
            <span>{t.cvParsing}</span>
          </div>
        )}
      </div>

      {/* ═══ CENTER — Preview ═══ */}
      <div className="cv-panel cv-panel--center">
        {isLoading && (
          <div className="cv-loading">
            <span className="cv-loading-spinner" />
            {t.cvParsing}
          </div>
        )}
        {!isLoading && parseError && (
          <div className="cv-error">{parseError}</div>
        )}
        {!isLoading && !parseError && previewSrc && (
          <iframe src={previewSrc} className="cv-iframe" title={t.cvPreviewTitle} />
        )}
        {!isLoading && !parseError && !previewSrc && activeCv?.content && (
          <div className="cv-text-preview">
            <pre className="cv-text-content">{activeCv.content}</pre>
          </div>
        )}
        {!isLoading && !parseError && !previewSrc && !activeCv?.content && (
          <div className="cv-center-empty">
            <span className="cv-drop-icon">📄</span>
            <span>{t.cvNoFile}</span>
          </div>
        )}
      </div>

      {/* ═══ RIGHT — Info / Skills / Chart ═══ */}
      <div className="cv-panel cv-panel--right">

        <section className="cv-section">
          <h3 className="cv-section-title">{t.cvCandidateInfo}</h3>
          {profile ? (
            <dl className="cv-info-list">
              {PROFILE_FIELDS.map(({ key, label, isLink }) => {
                const value = profile[key];
                if (!value || (Array.isArray(value) && value.length === 0)) return null;
                const displayValue = Array.isArray(value) ? value.join(", ") : String(value);
                const isUrl = isLink && typeof value === "string" && value.startsWith("http");
                return (
                  <div key={key} className="cv-info-row">
                    <dt className="cv-info-label">{t[label]}</dt>
                    <dd className="cv-info-value">
                      {isUrl ? (
                        <a href={value as string} target="_blank" rel="noopener noreferrer" className="cv-link">
                          {displayValue}
                        </a>
                      ) : displayValue}
                    </dd>
                  </div>
                );
              })}
              <div className="cv-info-row">
                <dt className="cv-info-label">{t.cvConfidence}</dt>
                <dd className="cv-info-value">
                  <span className="cv-confidence-bar">
                    <span className="cv-confidence-fill" style={{ width: `${Math.round((profile.confidence ?? 0) * 100)}%` }} />
                  </span>
                  {Math.round((profile.confidence ?? 0) * 100)}%
                </dd>
              </div>
              {parsedCv && parsedCv.pageCount > 0 && (
                <div className="cv-info-row">
                  <dt className="cv-info-label">{t.cvPages}</dt>
                  <dd className="cv-info-value">{parsedCv.pageCount}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="cv-empty-hint">{t.cvNoFile}</p>
          )}
        </section>

        <section className="cv-section">
          <h3 className="cv-section-title">{t.cvSkills}</h3>
          {hasCv && <p className="cv-skills-hint">{t.cvSkillsHint}</p>}
          <div className="cv-skills-list">
            {skills.map((skill) => (
              <button key={skill} type="button" className="cv-skill-chip" onClick={() => removeSkill(skill)} title={`Usuń: ${skill}`}>
                {skill}<span className="cv-skill-remove">×</span>
              </button>
            ))}
          </div>
          {hasCv && (
            <div className="cv-skill-add-row">
              <input
                type="text"
                className="cv-skill-input"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                placeholder={t.cvAddSkillPlaceholder}
              />
              <button type="button" className="cv-skill-add-btn" onClick={addSkill}>+</button>
            </div>
          )}
        </section>

        <section className="cv-section cv-section--chart">
          <h3 className="cv-section-title">{t.cvMatchChart}</h3>
          {offers.length === 0 || skills.length === 0 || matchData.length === 0 ? (
            <p className="cv-empty-hint">{t.cvNoOffersToMatch}</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={matchData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                  {matchData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} ofert`, name]} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: "0.72rem" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>

        {scoredOffers.length > 0 && (
          <section className="cv-section cv-section--offers">
            <h3 className="cv-section-title">{t.cvMatchedOffersList}</h3>
            <ul className="cv-offer-list">
              {scoredOffers.map(({ offer, score, matchedSkills }) => (
                <li key={offer.id ?? `${offer.company}-${offer.role}`} className="cv-offer-item">
                  <div className="cv-offer-header">
                    <span
                      className="cv-offer-badge"
                      style={{ background: matchColor(score) }}
                    >
                      {Math.round(score * 100)}%
                    </span>
                    <div className="cv-offer-title">
                      <span className="cv-offer-role">{offer.role}</span>
                      <span className="cv-offer-company">{offer.company}</span>
                    </div>
                    {offer.sourceUrl && (
                      <a
                        href={offer.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cv-offer-link"
                        title="Otwórz ofertę"
                      >
                        ↗
                      </a>
                    )}
                  </div>
                  {matchedSkills.length > 0 ? (
                    <div className="cv-offer-skills">
                      {matchedSkills.map((s) => (
                        <span key={s} className="cv-offer-skill-tag">{s}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="cv-offer-no-match">{t.cvNoMatchedSkills}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

      </div>
    </div>
  );
}
