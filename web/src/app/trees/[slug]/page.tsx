"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AccessRequestsQueue } from "@/components/access-requests-queue";
import { EditProposalsQueue } from "@/components/edit-proposals-queue";
import { FamilyTreeView } from "@/components/family-tree-view";
import { LineageRail } from "@/components/lineage-rail";
import { PersonCard } from "@/components/person-card";
import { PersonForm, type PersonFormValues } from "@/components/person-form";
import { PersonRelationships } from "@/components/person-relationships";
import { TreeMembers } from "@/components/tree-members";
import { TreePersonPanel } from "@/components/tree-person-panel";
import { apiFetch, ApiError, firstErrorMessage } from "@/lib/api-client";
import { useRequireAuth } from "@/lib/use-require-auth";
import {
  isEditProposal,
  type FamilyTree,
  type PaginatedPeople,
  type Person,
  type Relationship,
  type TreeRole,
} from "@/lib/types";

interface TreeShowResponse {
  tree: FamilyTree;
  people: Person[];
  relationships: Relationship[];
  is_member: boolean;
  role: TreeRole | null;
}

const PROPOSAL_SUBMITTED_MESSAGE =
  "Proposition envoyée — en attente de l'approbation d'un·e administrateur·rice.";

export default function TreeDetailPage() {
  useRequireAuth();
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [expandedPersonId, setExpandedPersonId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "tree">("list");
  const [selectedTreePerson, setSelectedTreePerson] = useState<Person | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["trees", slug],
    queryFn: () => apiFetch<TreeShowResponse>(`/api/trees/${slug}`),
  });

  // Paginated separately from the tree metadata above — a tree can run into
  // the thousands of people, and the "Liste" tab only ever needs one page
  // of them, not the same full graph the SVG "Arbre" tab needs to lay out
  // (that one still comes from the unpaginated `data.people` above).
  const { data: peopleData, isLoading: peopleLoading } = useQuery({
    queryKey: ["tree-people", slug, page],
    queryFn: () => apiFetch<PaginatedPeople>(`/api/trees/${slug}/people?page=${page}`),
    enabled: view === "list",
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["trees", slug] });
    queryClient.invalidateQueries({ queryKey: ["tree-people", slug] });
  };

  const createPerson = useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch<Person>(`/api/trees/${slug}/people`, {
        method: "POST",
        body: formData,
      }),
    onSuccess: (result) => {
      setError(null);
      setShowAddForm(false);
      setInfo(isEditProposal(result) ? PROPOSAL_SUBMITTED_MESSAGE : null);
      invalidate();
    },
    onError: (err: ApiError) => setError(firstErrorMessage(err)),
  });

  const updatePerson = useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) => {
      formData.set("_method", "PUT");
      return apiFetch<Person>(`/api/trees/${slug}/people/${id}`, {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (result) => {
      setError(null);
      setEditingPerson(null);
      setInfo(isEditProposal(result) ? PROPOSAL_SUBMITTED_MESSAGE : null);
      invalidate();
    },
    onError: (err: ApiError) => setError(firstErrorMessage(err)),
  });

  const deletePerson = useMutation({
    mutationFn: (id: number) =>
      apiFetch<Person | null>(`/api/trees/${slug}/people/${id}`, { method: "DELETE" }),
    onSuccess: (result) => {
      setExpandedPersonId(null);
      setInfo(isEditProposal(result) ? PROPOSAL_SUBMITTED_MESSAGE : null);
      invalidate();
    },
    onError: (err: ApiError) => setError(firstErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="h-4 w-32 bg-muted animate-pulse mb-4" />
        <div className="h-8 w-64 bg-muted animate-pulse mb-2" />
        <div className="h-4 w-48 bg-muted animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const { tree, people, relationships, is_member, role } = data;
  const canManage = role === "owner" || role === "admin";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      {/* Header */}
      <header className="border-b border-border pb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Mbokk · Registre
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-balance">
          {tree.name}
        </h1>
        {tree.description && (
          <p className="mt-1 text-sm text-muted-foreground">{tree.description}</p>
        )}
      </header>

      {/* Banners */}
      {error && (
        <div className="border-l-2 border-destructive bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      {info && (
        <div className="border-l-2 border-accent bg-accent/5 px-4 py-3">
          <p className="text-sm text-accent-foreground">{info}</p>
        </div>
      )}

      {/* View tab bar */}
      <div className="flex border border-border">
        <button
          type="button"
          className={`flex-1 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors ${
            view === "list"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setView("list")}
        >
          Liste
        </button>
        <button
          type="button"
          className={`flex-1 border-l border-border py-2.5 font-mono text-xs uppercase tracking-widest transition-colors ${
            view === "tree"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setView("tree")}
        >
          Arbre
        </button>
      </div>

      {/* Tree view */}
      {view === "tree" && (
        <div className="flex flex-col gap-4">
          <FamilyTreeView
            people={people}
            relationships={relationships}
            onSelectPerson={setSelectedTreePerson}
          />
          {selectedTreePerson && (
            <>
              <LineageRail
                person={selectedTreePerson}
                people={people}
                relationships={relationships}
                onSelectPerson={setSelectedTreePerson}
              />
              <TreePersonPanel
                person={selectedTreePerson}
                people={people}
                relationships={relationships}
                onSelectPerson={setSelectedTreePerson}
                onClose={() => setSelectedTreePerson(null)}
              />
            </>
          )}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="flex flex-col gap-0">
          {/* List header */}
          <div className="flex items-center justify-between border border-border bg-muted px-4 py-2">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {peopleData
                ? `${peopleData.meta.total} personne${peopleData.meta.total !== 1 ? "s" : ""}`
                : "…"}
            </p>
            {is_member && (
              <button
                type="button"
                onClick={() => {
                  setShowAddForm((v) => !v);
                  setEditingPerson(null);
                }}
                className="font-mono text-xs text-accent hover:underline underline-offset-4 transition-colors"
              >
                {showAddForm ? "Annuler" : "+ Ajouter"}
              </button>
            )}
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="border border-t-0 border-border p-4">
              <PersonForm
                submitLabel="Créer"
                pending={createPerson.isPending}
                error={null}
                onSubmit={({ formData }: PersonFormValues) =>
                  createPerson.mutate(formData)
                }
              />
            </div>
          )}

          {/* People list */}
          <div className="flex flex-col divide-y divide-border border border-t-0 border-border">
            {peopleLoading && (
              <p className="p-6 font-mono text-xs text-center text-muted-foreground">
                Chargement…
              </p>
            )}
            {peopleData?.people.length === 0 && (
              <p className="p-6 font-mono text-xs text-center text-muted-foreground">
                Aucune personne pour l&apos;instant.
              </p>
            )}
            {peopleData?.people.map((person) =>
              editingPerson?.id === person.id ? (
                <div key={person.id} className="p-4">
                  <PersonForm
                    initial={person}
                    submitLabel="Enregistrer"
                    pending={updatePerson.isPending}
                    error={null}
                    onSubmit={({ formData }: PersonFormValues) =>
                      updatePerson.mutate({ id: person.id, formData })
                    }
                  />
                  <button
                    type="button"
                    className="mt-3 font-mono text-xs text-muted-foreground underline underline-offset-4"
                    onClick={() => setEditingPerson(null)}
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <div key={person.id}>
                  <PersonCard
                    person={person}
                    onClick={() =>
                      setExpandedPersonId((cur) =>
                        cur === person.id ? null : person.id,
                      )
                    }
                  />
                  {expandedPersonId === person.id && (
                    <div className="flex flex-col gap-4 border-t border-border bg-muted/40 px-4 py-4">
                      {is_member && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPerson(person)}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Supprimer ${person.first_name} ?`)) {
                                deletePerson.mutate(person.id);
                              }
                            }}
                          >
                            Supprimer
                          </Button>
                        </div>
                      )}
                      <PersonRelationships person={person} slug={slug} />
                    </div>
                  )}
                </div>
              ),
            )}
          </div>

          {/* Pagination */}
          {peopleData && peopleData.meta.last_page > 1 && (
            <div className="flex items-center justify-between border border-t-0 border-border px-4 py-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setExpandedPersonId(null);
                  setPage((p) => Math.max(1, p - 1));
                }}
              >
                Précédent
              </Button>
              <p className="font-mono text-xs text-muted-foreground">
                Page {peopleData.meta.current_page} / {peopleData.meta.last_page}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= peopleData.meta.last_page}
                onClick={() => {
                  setExpandedPersonId(null);
                  setPage((p) => Math.min(peopleData.meta.last_page, p + 1));
                }}
              >
                Suivant
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Administration — collapsed by default, admin/owner only */}
      {canManage && (
        <details className="group border border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 hover:bg-muted">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Administration
            </span>
            <span className="font-mono text-xs text-muted-foreground group-open:hidden">›</span>
            <span className="font-mono text-xs text-muted-foreground hidden group-open:inline">‹</span>
          </summary>
          <div className="flex flex-col gap-8 border-t border-border p-4">
            <TreeMembers slug={slug} treeName={tree.name} />
            <AccessRequestsQueue slug={slug} />
            <EditProposalsQueue slug={slug} />
          </div>
        </details>
      )}
    </div>
  );
}
