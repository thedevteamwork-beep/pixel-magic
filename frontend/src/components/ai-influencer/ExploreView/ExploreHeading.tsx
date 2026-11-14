import styles from "./main.module.css";

export function ExploreHeading() {
  return (
    <header className={styles.heading}>
      <h2>
        Your influencer,
        <br />
        your viral hit
      </h2>
      <p>
        Build an AI influencer with the face, body and style you want. Start from a look, fine-tune every detail, then
        save them for every campaign.
      </p>
    </header>
  );
}
