package com.climaton.climautils.dto;

public record FatorAlavancagem(
    double variacaoInvestimentoPct, // Ex: 10.0
    double impactoGeralEstimadoPct, // Ex: 14.0
    String mensagemFormatada         // Ex: "Cada +10% em Financiamento gera +14.0% de impacto"
) {
    public static FatorAlavancagem criar(double roi) {
        double investimentoBase = 10.0;
        double impactoEstimado = Math.round(roi * investimentoBase * 10.0) / 10.0;
        String msg = String.format("Cada +%.0f%% em Financiamento gera +%.1f%% de impacto", investimentoBase, impactoEstimado);
        return new FatorAlavancagem(investimentoBase, impactoEstimado, msg);
    }
}