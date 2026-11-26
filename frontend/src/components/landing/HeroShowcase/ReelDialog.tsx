import { reelScenes } from "@/components/landing/constants";
import { templateAsset } from "@/constants/landing-media";
import { Modal } from "@/ui/Modal";
import styles from "./main.module.css";

type ReelDialogProps = {
  open: boolean;
  sceneIndex: number;
  autoPlay: boolean;
  onSelect: (index: number) => void;
  onClose: () => void;
};

/** "Watch the reel": a player with the showcase films to pick from. */
export function ReelDialog({ open, sceneIndex, autoPlay, onSelect, onClose }: ReelDialogProps) {
  const scene = reelScenes[sceneIndex] ?? reelScenes[0];
  const media = templateAsset(scene.asset);

  return (
    <Modal open={open} onClose={onClose} title="Pixel Magic / The showreel">
      {open && (
        <>
          <video
            key={scene.asset}
            className={styles.reelPlayer}
            src={media.video}
            poster={media.image}
            controls
            autoPlay={autoPlay}
            muted
            playsInline
            loop
            preload="metadata"
            aria-label={`${scene.label} showcase film`}
          />
          <div className={styles.reelScenes} role="group" aria-label="Showreel scenes">
            {reelScenes.map((item, index) => (
              <button
                key={item.asset}
                type="button"
                aria-pressed={index === sceneIndex}
                onClick={() => onSelect(index)}
              >
                <span aria-hidden="true">0{index + 1}</span>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
