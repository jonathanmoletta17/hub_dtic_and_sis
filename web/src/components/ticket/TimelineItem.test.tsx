import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { asIsoDateTimeString } from "@/lib/datetime/iso";
import type { TicketAttachment, TicketTimelineEntry } from "@/lib/api/models/ticket-detail";
import { TimelineItem } from "./TimelineItem";

describe("TimelineItem", () => {
  it("renders and dispatches attachments that belong to a timeline entry", async () => {
    const iso = asIsoDateTimeString("2026-04-30T17:17:33-03:00");
    const attachment: TicketAttachment = {
      id: 4115,
      relationId: 6265,
      parentType: "ITILFollowup",
      parentId: 18495,
      filename: "age_paste6581061.png",
      mimeType: "image/png",
      size: 25241,
      dateUpload: iso,
      url: "/api/v1/dtic/tickets/14134/attachments/4115/download",
    };
    const entry: TicketTimelineEntry = {
      id: 18495,
      type: "followup",
      sourceItemtype: "ITILFollowup",
      content: "",
      date: iso,
      userId: 32,
      userName: "Silvio Valim",
      isPrivate: false,
      documentRefs: [4115],
      attachments: [attachment],
    };
    const onPreviewAttachment = vi.fn();
    const onDownloadAttachment = vi.fn();

    render(
      <TimelineItem
        entry={entry}
        currentUserId={99}
        technicianUserId={32}
        onPreviewAttachment={onPreviewAttachment}
        onDownloadAttachment={onDownloadAttachment}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /abrir pre-visualizacao de age_paste6581061\.png/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: /baixar age_paste6581061\.png/i }));

    expect(screen.getByText("age_paste6581061.png")).toBeVisible();
    expect(onPreviewAttachment).toHaveBeenCalledWith(attachment);
    expect(onDownloadAttachment).toHaveBeenCalledWith(attachment);
  });
});
