"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/ui/Button";
import { useInfluencer } from "../InfluencerContext";
import { ResultView } from "../ResultView";
import { EmptyHistory } from "./EmptyHistory";
import { HistoryCard } from "./HistoryCard";
import styles from "./main.module.css";

/** The influencer being made or opened, large, on top; below it the saved influencers, one project each. */
export function HistoryView() {
  const { state } = useInfluencer();
  // Something to show on top: a portrait on its way, the latest result, an opened influencer, or what went wrong.
  const showLatest =
    state.status === "generating" || state.variations.length > 0 || state.projectId !== null || state.error !== "";
  return (
    <>
      {showLatest && (
        <section className={styles.latest} aria-label="Latest influencer">
          <ResultView />
        </section>
      )}
      {showLatest && state.projects.length > 0 && <h3 className={styles.heading}>Your influencers</h3>}
      <SavedInfluencers compact={showLatest} />
    </>
  );
}

/** The saved influencers. `compact` drops the full-page empty states when the latest influencer is shown above. */
function SavedInfluencers({ compact }: { compact: boolean }) {
  const { state, dispatch, openProject, removeProject, loadMoreProjects } = useInfluencer();
  const { projects, projectsCursor, projectsStatus } = state;
  const loading = projectsStatus === "loading";

  if (compact && !projects.length) return null;

  if (projectsStatus === "signed-out")
    return (
      <EmptyHistory
        title="Sign in to see your influencers"
        message="Every influencer you generate is saved to your account."
      >
        <Link href="/sign-in?next=/influencer">Sign in</Link>
      </EmptyHistory>
    );

  if (!projects.length) {
    if (loading)
      return (
        <p className={styles.loading} role="status">
          <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" />
          Loading your influencers…
        </p>
      );
    if (projectsStatus === "error")
      return (
        <EmptyHistory title="We couldn’t load your influencers" message="Check your connection and try again.">
          <button type="button" onClick={() => void loadMoreProjects()}>
            Try again
          </button>
        </EmptyHistory>
      );
    return (
      <EmptyHistory title="No saved influencers yet" message="Generate one and it’s saved here automatically.">
        <button type="button" onClick={() => dispatch({ type: "view", view: "templates" })}>
          Browse templates
        </button>
      </EmptyHistory>
    );
  }

  return (
    <>
      <ul className={styles.grid}>
        {projects.map((project) => (
          <li key={project.projectId}>
            <HistoryCard
              project={project}
              disabled={state.status === "generating"}
              onOpen={() => void openProject(project.projectId)}
              onRemove={() => void removeProject(project.projectId)}
            />
          </li>
        ))}
      </ul>
      {projectsCursor && (
        <div className={styles.more}>
          <Button variant="outline" disabled={loading} onClick={() => void loadMoreProjects()}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </>
  );
}
