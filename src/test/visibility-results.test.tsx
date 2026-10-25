import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { VisibilityResults } from '@/components/VisibilityResults';

const checks = [{ id: 'latest', status: 'done', started_at: '2026-10-25T12:00:00Z', engines: ['claude'], runs_per_question: 1 }];
const runs = Array.from({ length: 10 }, (_,i) => ({ id: `r${i}`, check_id: 'latest', engine: 'claude', question: `Buyer question ${i+1}`, status: 'done', answer_excerpt: `Saved answer ${i+1}`, cited_hosts: ['example.org'] }));
const mentions = Array.from({ length: 12 }, (_,i) => ({ run_id: 'r0', name: `Competitor ${i+1}`, rank: i+1, kind: 'competitor' }));
function mount() { return render(<VisibilityResults productName="Your product" checks={checks} runs={runs} mentions={mentions} fixes={[]} action={<span />} settings={<span />} onAddCompetitor={vi.fn()} />); }

describe('compact visibility interactions', () => {
  it('expands and collapses the complete competitor list', () => {
    mount();
    expect(screen.queryByText('Competitor 12')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show all 12' }));
    expect(screen.getByText('Competitor 12')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.queryByText('Competitor 12')).toBeNull();
  });
  it('expands the question list and an inline saved answer with citations', () => {
    mount();
    expect(screen.queryByRole('button', { name: 'Buyer question 10' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show all 10 questions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buyer question 10' }));
    expect(screen.getByText('Saved answer 10')).toBeInTheDocument();
    expect(screen.getByText('Cited sites: example.org')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Buyer question 10' }));
    expect(screen.queryByText('Saved answer 10')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show fewer questions' }));
    expect(screen.queryByRole('button', { name: 'Buyer question 10' })).toBeNull();
  });
  it('filters questions and never shows a zero share for an unusable engine', () => {
    mount();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'OpenAI' }), { button: 0, ctrlKey: false });
    expect(screen.getByText('OpenAI: no usable answers')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Buyer question 1' })).toBeNull();
    expect(screen.getByRole('tab', { name: 'OpenAI' })).toHaveAttribute('aria-selected','true');
  });
});