import { useMemo, useRef, useState } from "react";
import {
  ReguideProvider,
  useReguide,
  type ReguideStep,
  type ReguideTheme,
} from "reguide";
import "./App.css";

function TourLauncher() {
  const guide = useReguide();
  return (
    <div className="launcher">
      <button type="button" onClick={guide.start}>
        Start feature tour
      </button>
      <button type="button" onClick={() => guide.goToStepById("publish")}>
        Skip to validation step
      </button>
      <button type="button" onClick={guide.stop}>
        Close tour
      </button>
    </div>
  );
}

const CardBodyExampleComponent = ({ text }: { text: string }) => {
  return <div style={{ border: "1px dashed red" }}>{text}</div>;
};

export default function App() {
  const profileRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLTextAreaElement | null>(null);
  const publishRef = useRef<HTMLButtonElement | null>(null);
  const didPublishRef = useRef(false);

  const guideTheme = useMemo<ReguideTheme>(
    () => ({
      backdrop: {
        color: "#0a2240",
        opacity: 0.74,
      },
      card: {
        background: "#ffffff",
        border: "1px solid #bfdbfe",
        padding: 20,
        className: "guide-card-shell",
      },
      title: {
        fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
        fontWeight: 700,
        color: "#0f172a",
      },
      body: {
        fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
        fontWeight: 400,
        color: "#1e293b",
      },
      stepCount: {
        show: false,
      },
      highlight: {
        borderRadius: 18,
        padding: 8,
      },
    }),
    [],
  );

  const revealedRef = useRef<HTMLDivElement | null>(null);

  const steps = useMemo<ReguideStep[]>(
    () => [
      {
        id: "introduction",
        title: "See reguide in action",
        body: "This walkthrough highlights mode-based progression, per-step theming, and dynamic targets.",
      },
      {
        id: "profile",
        targetRef: profileRef,
        title: "Click-gated progression",
        body: "This step uses click mode, so Next unlocks only after the highlighted button is clicked.",
        mode: "click",
        theme: {
          stepCount: {
            show: true,
          },
          backdrop: {
            color: "#14041b",
          },
          title: {
            fontFamily: "Courier New",
            fontWeight: 600,
          },
          body: {
            fontFamily: "Courier New",
            fontWeight: 400,
          },
          buttons: {
            secondary: {
              background: "#eff6ff",
              border: "1px solid #93c5fd",
              color: "#1e3a8a",
              fontFamily: "Courier New",
              fontWeight: 600,
            },
            primary: {
              background: "#1d4ed8",
              border: "1px solid #1e40af",
              color: "#ffffff",
              fontFamily: "Courier New",
              fontWeight: 700,
            },
          },
        },
      },
      {
        id: "compose",
        targetRef: searchRef,
        title: "Interact mode + autofocus",
        body: "Typing in this field (or focusing it) satisfies the step and demonstrates guided interaction.",
        mode: "interact",
        autoFocus: true,
        theme: {
          card: {
            background: "#0f172a",
            border: "1px solid #1e293b",
          },
          title: {
            fontFamily: "Georgia, serif",
            fontWeight: 700,
            color: "#f8fafc",
          },
          body: {
            fontFamily: "Georgia, serif",
            fontWeight: 400,
            color: "#cbd5e1",
          },
          buttons: {
            primary: {
              background: "#f59e0b",
              border: "1px solid #d97706",
              color: "#111827",
              fontFamily: "Georgia, serif",
              fontWeight: 700,
            },
            secondary: {
              fontFamily: "Georgia, serif",
              fontWeight: 700,
            },
          },
          backdrop: {
            color: "#24042b",
          },
        },
      },
      {
        id: "publish",
        targetRef: publishRef,
        title: "Custom validator step",
        body: (
          <CardBodyExampleComponent text="Publishing a post must reveal the next section before this step can complete." />
        ),
        autoFocus: true,
        mode: "custom",
        progressOnValidate: true,
        validator: async () => {
          let s = new Promise<boolean>((resolve) => {
            setTimeout(() => {
              resolve(!!revealedRef.current);
            }, 15);
          });
          return s;
        },
        theme: {
          backdrop: {
            color: "#34143b",
          },
          primary: {
            background: "#f5aecb",
            border: "1px solid #d947c6",
            color: "#111827",
            fontWeight: 700,
          },
          secondary: {
            fontWeight: 700,
          },
        },
      },
      {
        id: "posts",
        targetRef: revealedRef,
        title: "Dynamic target resolved",
        body: "This target appears conditionally, showing that refs can point to content rendered later.",
        autoFocus: true,
        theme: {
          backdrop: {
            color: "#162208",
          },
          title: {
            fontFamily: "Garamond",
            fontWeight: "700",
          },
          body: {
            fontFamily: "Garamond",
            fontWeight: "400",
          },
          buttons: {
            primary: {
              background: "#259e0b",
              border: "1px solid #297706",
              color: "#111827",
              fontFamily: "Brush Script MT",
              fontWeight: 700,
            },
            secondary: {
              fontFamily: "Brush Script MT",
              fontWeight: 700,
            },
          },
        },
      },
    ],
    [],
  );

  const [content, setContent] = useState("");

  const [posts, setPosts] = useState<string[]>([]);

  return (
    <ReguideProvider
      steps={steps}
      theme={guideTheme}
      initialOpen={true}
      persistence={{ key: "reguide:demo-onboarding", persistIsOpen: true }}
      onStart={() => {
        console.log("[reguide] started");
      }}
      onStop={(event) => {
        console.log("[reguide] stopped", event);
      }}
      onStepChange={(event) => {
        console.log("[reguide] step changed", event);
      }}
    >
      <main className="page">
        <header className="topbar">
          <h1>reguide demo</h1>
          <button ref={profileRef} type="button">
            Open profile
          </button>
        </header>

        <section className="panel">
          <label htmlFor="search">Draft a post</label>
          <textarea
            id="search"
            ref={searchRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a line, then publish to trigger the conditional section."
          />
          <button
            ref={publishRef}
            type="button"
            onClick={() => {
              didPublishRef.current = true;
              setPosts((prev) => [...prev, content]);
              setContent("");
            }}
          >
            Publish post
          </button>
        </section>
        {posts.length > 0 && (
          <section className="panel" ref={revealedRef}>
            <h2>Published posts</h2>
            <div>
              {posts.map((post, index) => (
                <p key={index}>{post}</p>
              ))}
            </div>
          </section>
        )}
      </main>
      <footer>
        <TourLauncher />
      </footer>
    </ReguideProvider>
  );
}
