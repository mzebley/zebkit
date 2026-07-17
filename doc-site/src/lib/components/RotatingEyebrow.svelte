<script module lang="ts">
  // Homepage copy lives here. Add, edit, remove, or reorder lines without
  // touching the animation below.
  export const HOME_EYEBROW_LINES = [
    "The design is the variable.",
    "It's tokens the whole way down.",
    "A permanent system for ever-changing design.",
    "Components that hold steady even when the design wanders.",
    "Strongly held opinions, yet none about your aesthetic.",
    "A design system that was designed to disappear.",
  ] as const;
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { theme } from "$lib/stores/theme.svelte";

  interface Props {
    lines?: readonly string[];
    accessibleText?: string;
  }

  let {
    lines = HOME_EYEBROW_LINES,
    accessibleText = "A token-driven, accessibility-first design system",
  }: Props = $props();

  const normalizedLines = $derived.by(() => {
    const usableLines = lines.map((line) => line.trim()).filter(Boolean);
    return usableLines.length > 0 ? usableLines : [accessibleText];
  });
  const longestLine = $derived(
    normalizedLines.reduce(
      (longest, line) => (line.length > longest.length ? line : longest),
      "",
    ),
  );

  let initialized = $state(false);
  let visibleText = $state("");
  let showCursor = $state(false);
  const renderedText = $derived(
    initialized ? visibleText : normalizedLines[0],
  );

  const SPEED_MULTIPLIER = 1.5;
  const pace = (duration: number): number => duration * SPEED_MULTIPLIER;
  const jitter = (base: number, spread: number): number =>
    pace(base + Math.random() * spread * 2 - spread);

  const typeDelay = (character: string): number => {
    if (".,;:!?".includes(character)) return jitter(170, 25);
    if (character === " ") return jitter(35, 8);
    return jitter(68, 18);
  };

  onMount(() => {
    const collection = normalizedLines;
    let currentIndex = Math.floor(Math.random() * collection.length);
    let runVersion = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let finishSleep: (() => void) | undefined;

    const cancelSleep = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      const finish = finishSleep;
      finishSleep = undefined;
      finish?.();
    };

    const sleep = (duration: number): Promise<void> =>
      new Promise((resolve) => {
        finishSleep = resolve;
        timer = setTimeout(() => {
          timer = undefined;
          finishSleep = undefined;
          resolve();
        }, duration);
      });

    const typeLine = async (version: number, line: string) => {
      for (const character of Array.from(line)) {
        if (version !== runVersion) return;
        visibleText += character;
        await sleep(typeDelay(character));
      }
    };

    const rotate = async (version: number, typeOpeningLine: boolean) => {
      if (typeOpeningLine) {
        visibleText = "";
        await sleep(pace(380));
        if (version !== runVersion) return;
        await typeLine(version, collection[currentIndex]);
      }

      if (version !== runVersion) return;
      await sleep(pace(2600));

      while (version === runVersion) {
        while (version === runVersion && visibleText.length > 0) {
          visibleText = Array.from(visibleText).slice(0, -1).join("");
          await sleep(jitter(38, 10));
        }

        if (version !== runVersion) return;
        await sleep(pace(240));
        if (version !== runVersion) return;

        currentIndex = (currentIndex + 1) % collection.length;
        await typeLine(version, collection[currentIndex]);

        if (version !== runVersion) return;
        await sleep(pace(2600));
      }
    };

    const reducedMotionIsActive = () =>
      theme.reducedMotion ||
      document.documentElement.hasAttribute("data-zbk-reduced-motion") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const applyMotionPreference = () => {
      const typeOpeningLine = !initialized;
      runVersion += 1;
      cancelSleep();

      const shouldAnimate =
        !reducedMotionIsActive() && collection.length > 1;
      showCursor = shouldAnimate;

      if (shouldAnimate) void rotate(runVersion, typeOpeningLine);
      else visibleText = collection[currentIndex];

      initialized = true;
    };

    visibleText = "";
    applyMotionPreference();

    const motionObserver = new MutationObserver(applyMotionPreference);
    motionObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-zbk-reduced-motion"],
    });

    return () => {
      runVersion += 1;
      showCursor = false;
      motionObserver.disconnect();
      cancelSleep();
    };
  });
</script>

<p class="eyebrow">
  <span class="visually-hidden">{accessibleText}</span>
  <span class="type-stage display-grid width-full" aria-hidden="true">
    <span class="measure overflow-wrap-anywhere"
      >{longestLine}<span class="cursor-space">|</span></span
    >
    <span class="animated-text overflow-wrap-anywhere"
      >{renderedText}{#if showCursor}<span class="type-cursor">|</span>{/if}</span
    >
  </span>
</p>

<style>
  .eyebrow {
    margin: 0;
    font-family: var(--zbk-font-family-primary);
    letter-spacing: var(--zbk-letter-spacing-tight);
    font-size: var(--zbk-font-size-md);
    color: var(--zbk-accent-secondary-300);
    font-weight: 400;
    font-style: italic;
  }

  .type-stage {
    min-width: 0;
  }

  .measure,
  .animated-text {
    grid-area: 1 / 1;
  }

  .measure {
    visibility: hidden;
  }

  .cursor-space,
  .type-cursor {
    font-style: normal;
  }

  .type-cursor {
    display: inline-block;
    color: var(--zbk-accent-primary-300);
    animation: cursor-blink
      calc(
        var(--zbk-transition-playful-motion-duration-slow) +
          var(--zbk-transition-playful-motion-duration-fast)
      )
      step-end infinite;
  }

  @keyframes cursor-blink {
    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0;
    }
  }

  :global(html[data-zbk-reduced-motion]) .type-cursor {
    animation: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .type-cursor {
      animation: none;
    }
  }
</style>
