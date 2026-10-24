import { expect, test } from '@playwright/test';

test('leaderboard preserves the assigned denominator and configuration filters', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./#/results');
  const rows = page.locator('.leaderboard tbody tr');
  const projectRows = page.locator('.matrix tbody tr');
  await expect(rows).toHaveCount(8);
  await expect(projectRows).toHaveCount(8);
  await expect(rows.first()).toContainText('Grok 4.6');
  await expect(rows.first()).toContainText('207');
  await expect(rows.first()).toContainText('265');
  await expect(rows.first()).toContainText('78.1');
  await expect(page.getByRole('columnheader', { name: /Completed/i })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link')).toHaveCount(2);
  await page.getByRole('button', { name: 'Include harnesses', exact: true }).click();
  await expect(rows).toHaveCount(10);
  await expect(projectRows).toHaveCount(10);
  await expect(rows.first()).toContainText('Anthropic harness');
  await expect(rows.first()).toContainText('212');
  await expect(rows.first()).toContainText('265');
  await expect(rows.first()).toContainText('80.0');
  await page.getByLabel('Project', { exact: true }).selectOption('curl');
  await expect(rows).toHaveCount(10);
  await expect(rows.first()).toContainText('/ 26');
  await page.getByRole('button', { name: 'Direct models', exact: true }).click();
  await expect(rows).toHaveCount(8);
  await expect(projectRows).toHaveCount(8);
  await expect(page.getByLabel('Project', { exact: true })).toHaveValue('curl');
  await expect(rows.first()).toContainText('/ 26');
  expect(errors).toEqual([]);
});

test('all cases are searchable, collapsible, and filterable by detection', async ({ page }) => {
  await page.goto('./#/tasks');
  await expect(page.getByTestId('case-row')).toHaveCount(265);
  await page.getByLabel('Model', { exact: true }).selectOption('opus');
  await page.getByLabel('Detection', { exact: true }).selectOption('detected');
  await expect(page.getByTestId('case-row')).toHaveCount(196);
  await page.getByLabel('Model', { exact: true }).selectOption('defending');
  await page.getByLabel('Detection', { exact: true }).selectOption('missing');
  await expect(page.getByTestId('case-row')).toHaveCount(5);
  await page.getByLabel('Search cases').fill('no-case-has-this-identifier');
  await expect(page.getByRole('heading', { name: 'No matching cases' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).last().click();
  await expect(page.getByTestId('case-row')).toHaveCount(265);
  await page.getByLabel('Search cases').fill('CVE-2025-0167');
  await expect(page.getByTestId('case-row')).toHaveCount(1);
  await expect(page.getByTestId('model-detection')).toHaveCount(10);
  const toggle = page.locator('.case-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Jump to bug', exact: true })).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('a deep-linked commit has highlighted source, accessible ground truth, and caveats', async ({ page }) => {
  await page.goto('./#/tasks?case=curl%2FCVE-2025-0167');
  await page.getByRole('button', { name: 'Jump to bug', exact: true }).click();
  const marker = page.getByRole('button', { name: 'Ground truth at line 310', exact: true });
  await expect(marker).toBeVisible();
  await marker.focus();
  const popup = page.getByTestId('ground-truth-popover');
  await expect(popup).toBeVisible();
  await expect(popup).toContainText('credential');
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await marker.click();
  await expect(popup).toBeVisible();
  await page.getByRole('button', { name: 'Close ground truth', exact: true }).click();
  await expect(page.locator('.code-line code span').first()).toBeVisible();
  await expect(page.locator('.code-line.delete.bug-line')).toHaveCount(0);
  await expect(page.locator('.case-expanded-content')).toContainText('CRLF');
  await page.getByRole('button', { name: 'Fix companion', exact: true }).click();
  await expect(page.locator('.code-viewer')).toBeVisible();
  await expect(page.locator('.bug-line-marker')).toHaveCount(0);
});

test('saved gzip trajectories load with missing and model-switch states kept separate', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./#/tasks?case=curl%2FCVE-2025-0167');
  await page.getByRole('button', { name: 'Trajectories', exact: true }).click();
  await page.getByLabel('Trajectory reviewer').selectOption('defending');
  await expect(page.locator('.trajectory-panel')).toContainText('Review missing');
  await expect(page.getByRole('button', { name: 'Open trajectory', exact: true })).toHaveCount(0);
  await page.getByLabel('Trajectory reviewer').selectOption('opus');
  await page.getByRole('button', { name: 'Open trajectory', exact: true }).click();
  await expect(page.getByTestId('trajectory-event').first()).toBeVisible();
  await expect(page.getByTestId('trajectory-event')).toHaveCount(13);
  await page.getByLabel('Search trajectory').fill('this-is-never-a-trajectory-token');
  await expect(page.locator('.trajectory-panel')).toContainText('No events match this search');
  await page.getByLabel('Search trajectory').fill('');
  await page.getByLabel('Trajectory reviewer').selectOption('codex');
  await page.getByRole('button', { name: 'Open trajectory', exact: true }).click();
  await expect(page.getByTestId('trajectory-event').first()).toBeVisible();
  await expect(page.locator('.trajectory-reviewer')).toContainText('Codex Security');
  await page.getByRole('button', { name: 'Fix companion', exact: true }).click();
  await expect(page.getByTestId('trajectory-event')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('annotated context files start in source mode and absent mappings stay explicit', async ({ page }) => {
  await page.goto('./#/tasks?case=v8%2F408042977');
  await expect(page.getByRole('button', { name: 'Source', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.code-unavailable')).toHaveCount(0);
  await page.goto('./#/tasks?case=wasmtime%2FCVE-2026-34983');
  await expect(page.locator('.case-expanded-content')).toContainText(/unmapped|not.*mapped|unverified|not.*validated/i);
  await expect(page.locator('.bug-line-marker')).toHaveCount(0);
});

test('overlapping findings and partial excerpt evidence remain inspectable', async ({ page }) => {
  await page.goto('./#/tasks?case=firefox%2F1951554');
  // This case initially opens nsHttpChannel.cpp, its first annotated file.
  // The two findings overlap in nsHttpTransaction.cpp, so select that file first.
  await page.getByRole('button', { name: /^netwerk\/protocol\/http\/nsHttpTransaction\.cpp\b/ }).click();
  await page.getByRole('button', { name: 'Jump to bug', exact: true }).click();
  const overlapping = page.getByRole('button', { name: 'Ground truth at line 1021', exact: true });
  await expect(overlapping).toBeVisible();
  await overlapping.scrollIntoViewIfNeeded();
  await overlapping.click();
  await expect(page.getByTestId('ground-truth-popover')).toBeVisible();
  await expect(page.getByTestId('ground-truth-popover').locator('h3')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await page.goto('./#/tasks?case=curl%2FCVE-2026-3805');
  await page.getByRole('button', { name: 'Jump to bug', exact: true }).click();
  await page.getByRole('button', { name: 'Ground truth at line 991', exact: true }).click();
  await expect(page.getByTestId('ground-truth-popover')).toContainText(/excerpt|anchor/i);
});

test('keyboard skip navigation preserves the current route', async ({ page }) => {
  await page.goto('./#/results');
  await expect(page.locator('.leaderboard')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/results$/);
  await expect(page.locator('#main-content')).toBeFocused();
});

test('mobile case view stays within the viewport and annotations work by tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/tasks?case=curl%2FCVE-2025-0167');
  await page.getByRole('button', { name: 'Jump to bug', exact: true }).click();
  await page.getByRole('button', { name: 'Ground truth at line 310', exact: true }).click();
  await expect(page.getByTestId('ground-truth-popover')).toBeVisible();
  const box = await page.getByTestId('ground-truth-popover').boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(391);
  await page.getByRole('button', { name: 'Close ground truth', exact: true }).click();
  const width = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.width + 1);
});

test('mobile results keep the model and recall visible without document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/results');
  const first = page.getByTestId('leaderboard-row').first();
  await expect(first.locator('.model-name strong')).toContainText('Grok 4.6');
  await expect(first.locator('.recall-value strong')).toHaveText('78.1%');
  await expect(first).toContainText(/207\s*\/\s*265/);
  for (const locator of [first.locator('.model-name strong'), first.locator('.recall-value strong')]) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  const width = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.width + 1);
});

test('the hero replays a real introducing diff and links to the case explorer', async ({ page }) => {
  await page.goto('./#/results');
  const stage = page.locator('.diff-stage');
  await expect(stage).toBeVisible();
  await expect(stage.locator('.stage-caption')).toHaveClass(/shown/, { timeout: 10_000 });
  await expect(stage.locator('.stage-line.lit').first()).toBeVisible();
  await expect(stage.locator('.verdict-chip')).toHaveCount(10);
  await expect(stage.locator('.stage-counter')).toHaveText('1 / 14');
  await page.getByRole('button', { name: 'Next case', exact: true }).click();
  await expect(stage.locator('.stage-counter')).toHaveText('2 / 14');
  await expect(stage.locator('.stage-caption')).toHaveClass(/shown/, { timeout: 10_000 });
  await page.goto('./#/tasks?found=0&scope=direct');
  await expect(page.getByTestId('case-row')).toHaveCount(23);
  await expect(page.locator('.active-model-note')).toContainText('0 of 8');
});
