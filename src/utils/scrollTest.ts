/**
 * Scroll test utility - scroll'un çalışıp çalışmadığını kontrol eder
 */

export interface ScrollTestResult {
  isScrollable: boolean;
  hasOverflow: boolean;
  scrollHeight: number;
  clientHeight: number;
  overflowY: string;
  issues: string[];
}

/**
 * Bir elementin scroll edilebilir olup olmadığını test eder
 */
export function testScroll(element: HTMLElement | null): ScrollTestResult {
  const result: ScrollTestResult = {
    isScrollable: false,
    hasOverflow: false,
    scrollHeight: 0,
    clientHeight: 0,
    overflowY: "",
    issues: [],
  };

  if (!element) {
    result.issues.push("Element bulunamadı");
    return result;
  }

  const computedStyle = window.getComputedStyle(element);
  const overflowY = computedStyle.overflowY;
  const height = computedStyle.height;
  const minHeight = computedStyle.minHeight;
  const flex = computedStyle.flex;
  const display = computedStyle.display;

  const isMainScrollMain =
    element.tagName === "MAIN" && element.classList.contains("main-scroll-container");

  result.scrollHeight = element.scrollHeight;
  result.clientHeight = element.clientHeight;
  result.overflowY = overflowY;
  result.hasOverflow = result.scrollHeight > result.clientHeight;

  // Scroll kontrolü
  if (overflowY !== "auto" && overflowY !== "scroll") {
    result.issues.push(`overflow-y: ${overflowY} (auto veya scroll olmalı)`);
  }

  /* MainLayout main: flex öğesi overflow-y:auto ile yükseklik flex ile çözülür (0px değil); bu durumda
     "height: 0 şart" sezgisi yanlış pozitif üretir. */
  if (!isMainScrollMain && (display === "flex" || flex !== "none")) {
    if (minHeight !== "0px" && minHeight !== "0") {
      result.issues.push(`min-height: ${minHeight} (flexbox scroll için min-height: 0 olmalı)`);
    }
    if (height !== "0px" && height !== "0" && overflowY === "auto") {
      result.issues.push(`height: ${height} (flexbox scroll için height: 0 olmalı)`);
    }
  }

  // Scroll edilebilirlik kontrolü
  if (result.hasOverflow && (overflowY === "auto" || overflowY === "scroll")) {
    result.isScrollable = true;
  } else if (result.hasOverflow) {
    result.issues.push("İçerik container'dan uzun ama overflow-y auto/scroll değil");
  }

  return result;
}

/**
 * MainLayout'taki main elementinin scroll durumunu test eder
 */
export function testMainLayoutScroll(): ScrollTestResult | null {
  if (typeof window === "undefined") return null;

  const mainElement = document.querySelector("main.main-scroll-container") as HTMLElement;
  if (!mainElement) {
    return {
      isScrollable: false,
      hasOverflow: false,
      scrollHeight: 0,
      clientHeight: 0,
      overflowY: "",
      issues: ["main.main-scroll-container elementi bulunamadı"],
    };
  }

  return testScroll(mainElement);
}

/**
 * Scroll test sonuçlarını konsola yazdırır (development için)
 */
export function logScrollTest(): void {
  if (!import.meta.env.DEV) return;

  const result = testMainLayoutScroll();
  if (!result) {
    if (import.meta.env.DEV) {
      console.warn("Scroll test: MainLayout elementi bulunamadı");
    }
    return;
  }

  if (import.meta.env.DEV) {
    console.group("🔍 Scroll Test Sonuçları");
    console.log("Scroll edilebilir:", result.isScrollable ? "✅" : "❌");
    console.log("Overflow var:", result.hasOverflow ? "✅" : "❌");
    console.log("Overflow-Y:", result.overflowY);
    console.log("Scroll Height:", result.scrollHeight, "px");
    console.log("Client Height:", result.clientHeight, "px");
    if (result.issues.length > 0) {
      console.warn("Sorunlar:", result.issues);
    } else {
      console.log("✅ Scroll yapılandırması doğru görünüyor");
    }
    console.groupEnd();
  }
}

