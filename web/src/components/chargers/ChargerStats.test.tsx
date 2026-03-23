import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import StatCards from "./ChargerStats";

describe("ChargerStats Component", () => {
  const mockStats = {
    livres: 15,
    reservados: 3,
    emOperacao: 5,
    offline: 2,
    total: 25,
  };

  it("renders P0 status cards correctly", () => {
    render(<StatCards stats={mockStats} />);

    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Livres")).toBeInTheDocument();

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Reservados")).toBeInTheDocument();

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Em Operacao")).toBeInTheDocument();

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();

    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });
});
