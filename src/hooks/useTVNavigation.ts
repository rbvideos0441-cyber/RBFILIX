import { useEffect } from 'react';

/**
 * Calculates visual directional distance to find the nearest element
 * according to the standard spatial navigation model.
 */
function navigateSpatial(direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') {
  const activeEl = document.activeElement as HTMLElement;
  const focusables = Array.from(document.querySelectorAll('.tv-focusable')) as HTMLElement[];
  
  // Filter elements to get only those that are visible, interactable, and in the viewport or active modal
  const visibleFocusables = focusables.filter(el => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const isVisible = rect.width > 0 && rect.height > 0 && 
                      style.display !== 'none' && 
                      style.visibility !== 'hidden' &&
                      style.opacity !== '0';
    return isVisible;
  });

  if (visibleFocusables.length === 0) return;

  // If no element is focused, or the active element is not a registered focusable, focus the first one
  if (!activeEl || !visibleFocusables.includes(activeEl)) {
    // Pick the most outstanding element first if possible (like category, search, details, row first card)
    const priorityEl = visibleFocusables.find(el => el.id === 'tv-nav-start') || visibleFocusables[0];
    priorityEl.focus();
    priorityEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    return;
  }

  const currentRect = activeEl.getBoundingClientRect();
  const Cx = currentRect.left + currentRect.width / 2;
  const Cy = currentRect.top + currentRect.height / 2;

  let bestCandidate: HTMLElement | null = null;
  let minScore = Infinity;

  for (const candidate of visibleFocusables) {
    if (candidate === activeEl) continue;

    const candRect = candidate.getBoundingClientRect();
    const Px = candRect.left + candRect.width / 2;
    const Py = candRect.top + candRect.height / 2;

    const dx = Px - Cx;
    const dy = Py - Cy;

    let isValid = false;
    let score = Infinity;

    // Use weighted distance formula to prefer rectilinear movement over diagonal drift
    const weightOrthogonal = 4.5;

    if (direction === 'ArrowRight') {
      isValid = Px > Cx + 2; 
      score = dx + weightOrthogonal * Math.abs(dy);
    } else if (direction === 'ArrowLeft') {
      isValid = Px < Cx - 2; 
      score = Math.abs(dx) + weightOrthogonal * Math.abs(dy);
    } else if (direction === 'ArrowDown') {
      isValid = Py > Cy + 2; 
      score = dy + weightOrthogonal * Math.abs(dx);
    } else if (direction === 'ArrowUp') {
      isValid = Py < Cy - 2; 
      score = Math.abs(dy) + weightOrthogonal * Math.abs(dx);
    }

    if (isValid && score < minScore) {
      minScore = score;
      bestCandidate = candidate;
    }
  }

  if (bestCandidate) {
    bestCandidate.focus();
    bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }
}

export function useTVNavigation(onBack?: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const keyCode = e.keyCode;

      if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
        // Prevent page viewport scrolls from breaking the TV visual focus flow
        e.preventDefault();
        navigateSpatial(key);
      } else if (key === 'Enter' || keyCode === 13) {
        const activeEl = document.activeElement as HTMLElement;
        if (activeEl && activeEl.classList.contains('tv-focusable')) {
          e.preventDefault();
          activeEl.click();
        }
      } else if (key === 'Escape' || key === 'Backspace' || keyCode === 4) {
        // Handle android phone/TV back buttons or standard escape/backspace
        e.preventDefault();
        if (onBack) {
          onBack();
        } else {
          // Automatic back navigation helper for movie details and panels
          const detailsCloseBtn = document.getElementById('movie-details-close-btn') as HTMLElement;
          const adminCloseBtn = document.getElementById('admin-panel-close-btn') as HTMLElement;
          if (detailsCloseBtn) {
            detailsCloseBtn.click();
          } else if (adminCloseBtn) {
            adminCloseBtn.click();
          }
        }
      }
    };

    // Auto focus initial element if user interacts with a remote/keyboard d-pad
    const handleInitialFocus = (e: KeyboardEvent) => {
      const isDpad = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key);
      if (!isDpad) return;

      const activeEl = document.activeElement;
      const focusables = Array.from(document.querySelectorAll('.tv-focusable')) as HTMLElement[];
      const visibleFocusables = focusables.filter(el => el.getBoundingClientRect().width > 0);

      if (visibleFocusables.length > 0 && (!activeEl || activeEl === document.body)) {
        visibleFocusables[0].focus();
        visibleFocusables[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleInitialFocus);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleInitialFocus);
    };
  }, [onBack]);
}
