package com.retailtouch.reporting.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.opencsv.CSVWriter;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class CsvExporter {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public byte[] exportTransactions(List<Map<String, Object>> transactions) throws IOException {
        try (StringWriter stringWriter = new StringWriter();
                CSVWriter csvWriter = new CSVWriter(stringWriter)) {

            Set<String> headers = collectHeaders(transactions);
            List<String> orderedHeaders = new ArrayList<>(headers);

            if (!orderedHeaders.isEmpty()) {
                csvWriter.writeNext(orderedHeaders.toArray(String[]::new));

                for (Map<String, Object> transaction : transactions) {
                    String[] row = orderedHeaders.stream()
                            .map(header -> toCellValue(transaction.get(header)))
                            .toArray(String[]::new);
                    csvWriter.writeNext(row);
                }
            }

            csvWriter.flush();
            return stringWriter.toString().getBytes(StandardCharsets.UTF_8);
        }
    }

    private Set<String> collectHeaders(List<Map<String, Object>> transactions) {
        LinkedHashSet<String> headers = new LinkedHashSet<>();
        for (Map<String, Object> transaction : transactions) {
            headers.addAll(transaction.keySet());
        }
        return headers;
    }

    private String toCellValue(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof Map || value instanceof List) {
            try {
                return objectMapper.writeValueAsString(value);
            } catch (JsonProcessingException e) {
                return String.valueOf(value);
            }
        }
        return String.valueOf(value);
    }
}
