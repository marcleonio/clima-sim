package com.climaton.climautils.dto.response;

import com.climaton.climautils.dto.enums.TipoTradeOff;

public record TradeOffResponse(
    TipoTradeOff tipo,                 // "GANHO", "PERDA", "NEUTRO"
    String eixoAfetado,          // "Governança"
    String titulo,               // "Risco na Transparência"
    String descricaoAmigavel     // "A aceleração de obras reduz a capacidade de consulta pública."
) {}
