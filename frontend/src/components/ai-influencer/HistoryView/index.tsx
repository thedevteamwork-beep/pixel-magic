"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/ui/Button";
import { useInfluencer } from "../InfluencerContext";
import { EmptyHistory } from "./EmptyHistory";
import { HistoryCard } from "./HistoryCard";
import styles from "./main.module.css";

/** Saved influencers: one project each, kept in the signed-in account. */
export function HistoryView() {
  const { state, dispatch, openProject, removeProject, loadMoreProjects } = useInfluencer();
  const { projects, projectsCursor, projectsStatus } = state;
  const loading = projectsStatus === "loading";

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
        <button type="button" onClick={() => dispatch({ type: "view", view: "explore" })}>
          Explore looks
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
