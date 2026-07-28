import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, MessageSquareText, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";

export const Route = createFileRoute("/feedback")({
  head: () => ({ meta: [{ title: "Feedback — TechStock" }] }),
  component: FeedbackPage,
});

type Feedback = {
  id: number;
  category: string;
  message: string;
  createdAt: string;
  submittedBy: string;
  submittedByRole: string;
  response: string | null;
  respondedBy: string | null;
  respondedAt: string | null;
};

const categories = [
  { value: "BUG", label: "Report a problem" },
  { value: "SUGGESTION", label: "Share a suggestion" },
  { value: "GENERAL", label: "General feedback" },
];

function FeedbackPage() {
  const { currentUser } = useApp();
  const queryClient = useQueryClient();
  const canReview = currentUser?.role === "Admin" || currentUser?.role === "Manager" || currentUser?.role === "Warehouse_Manager";
  const [category, setCategory] = useState("GENERAL");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const feedbackQuery = useQuery<Feedback[]>({
    queryKey: ["feedback"],
    queryFn: async () => (await api.get("/feedback")).data,
  });

  const submitMutation = useMutation({
    mutationFn: async () => api.post("/feedback", { category, message: message.trim() }),
    onSuccess: () => {
      setMessage("");
      setCategory("GENERAL");
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
    onError: (requestError: any) => setError(requestError.response?.data?.message || "We couldn't send your feedback. Please try again."),
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitted(false);
    if (!message.trim()) return setError("Please enter your feedback.");
    submitMutation.mutate();
  };

  return (
    <AppShell>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{canReview ? "Feedback inbox" : "Send feedback"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canReview ? "Review feedback and reply when follow-up is needed." : "Share your experience or report a problem to your warehouse management team."}
          </p>
        </div>

        {!canReview && <FeedbackForm category={category} setCategory={setCategory} message={message} setMessage={setMessage} error={error} submitted={submitted} isSubmitting={submitMutation.isPending} onSubmit={submit} />}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{canReview ? "All feedback" : "My feedback"}</h2>
            {feedbackQuery.isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
          {feedbackQuery.isError && <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">Unable to load feedback. Please refresh and try again.</div>}
          {feedbackQuery.data?.length === 0 && <div className="surface-card p-6 text-sm text-muted-foreground">No feedback has been submitted yet.</div>}
          {feedbackQuery.data?.map((feedback) => <FeedbackCard key={feedback.id} feedback={feedback} canReview={canReview} />)}
        </section>
      </div>
    </AppShell>
  );
}

function FeedbackForm({ category, setCategory, message, setMessage, error, submitted, isSubmitting, onSubmit }: { category: string; setCategory: (value: string) => void; message: string; setMessage: (value: string) => void; error: string; submitted: boolean; isSubmitting: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit} className="surface-card p-6 space-y-6">
    {submitted && <div role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 flex gap-2 items-center"><CheckCircle2 className="size-4 shrink-0" /> Thank you — your feedback has been sent.</div>}
    {error && <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
    <label className="block"><span className="text-sm font-medium">What would you like to share?</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full h-10 rounded-lg border border-border bg-input px-3 text-sm">{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    <label className="block"><span className="text-sm font-medium">Your feedback</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={6} placeholder="Tell us what worked well or what we can improve..." className="mt-2 w-full resize-y rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /><span className="mt-1 block text-right text-xs text-muted-foreground">{message.length}/2000</span></label>
    <div className="flex justify-end"><button type="submit" disabled={isSubmitting} className="h-10 rounded-lg px-5 text-sm font-medium text-primary-foreground inline-flex items-center gap-2 disabled:opacity-50" style={{ background: "var(--gradient-primary)" }}>{isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send feedback</button></div>
  </form>;
}

function FeedbackCard({ feedback, canReview }: { feedback: Feedback; canReview: boolean }) {
  const queryClient = useQueryClient();
  const [response, setResponse] = useState("");
  const responseMutation = useMutation({
    mutationFn: async () => api.put(`/feedback/${feedback.id}/response`, { response: response.trim() }),
    onSuccess: () => { setResponse(""); queryClient.invalidateQueries({ queryKey: ["feedback"] }); },
  });
  const label = categories.find((category) => category.value === feedback.category)?.label || feedback.category;
  return <article className="surface-card p-5 space-y-4">
    <div><div className="font-medium">{label}</div><div className="mt-1 text-xs text-muted-foreground">{canReview ? `${feedback.submittedBy} · ${feedback.submittedByRole.replaceAll("_", " ")} · ` : "Submitted "}{new Date(feedback.createdAt).toLocaleString()}</div></div>
    <p className="whitespace-pre-wrap text-sm">{feedback.message}</p>
    {feedback.response && <div className="rounded-lg border border-primary/20 bg-primary/5 p-4"><div className="text-sm font-medium">Response from {feedback.respondedBy}</div><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{feedback.response}</p></div>}
    {canReview && <form onSubmit={(event) => { event.preventDefault(); if (response.trim()) responseMutation.mutate(); }} className="border-t border-border pt-4"><label className="text-sm font-medium">{feedback.response ? "Update response" : "Reply"}<textarea value={response} onChange={(event) => setResponse(event.target.value)} maxLength={2000} rows={3} placeholder="Write a response to this feedback..." className="mt-2 w-full resize-y rounded-lg border border-border bg-input px-3 py-2 text-sm" /></label>{responseMutation.isError && <p className="mt-2 text-sm text-destructive">Unable to save the response.</p>}<div className="mt-3 flex justify-end"><button disabled={!response.trim() || responseMutation.isPending} className="h-9 rounded-lg bg-secondary border border-border px-4 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50">{responseMutation.isPending && <Loader2 className="size-4 animate-spin" />} Save response</button></div></form>}
  </article>;
}
