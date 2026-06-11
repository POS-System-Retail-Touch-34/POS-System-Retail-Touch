package com.retailtouch.reporting.util;

import com.retailtouch.reporting.dto.SalesSummary;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.Map;

@Component
public class PdfGenerator {

    public byte[] generateSalesReport(SalesSummary summary) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 20);
                contentStream.newLineAtOffset(50, 750);
                contentStream.showText("RetailTouch - Sales Report");
                contentStream.endText();

                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA, 12);
                contentStream.newLineAtOffset(50, 700);
                contentStream.showText("Report Type: " + summary.getLabel());
                contentStream.newLineAtOffset(0, -20);
                contentStream.showText("Total Transactions: " + summary.getTransactionCount());
                contentStream.newLineAtOffset(0, -20);
                contentStream.showText("Total Sales: " + summary.getTotalSales());
                contentStream.newLineAtOffset(0, -20);
                contentStream.showText("Total Tax: " + summary.getTotalTax());
                contentStream.endText();
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }

    public byte[] generateDailyReport(Map<String, Object> summary, LocalDate date) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 20);
                contentStream.newLineAtOffset(50, 750);
                contentStream.showText("RetailTouch - Daily Report");
                contentStream.endText();

                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA, 12);
                contentStream.newLineAtOffset(50, 700);
                contentStream.showText("Date: " + date);
                contentStream.newLineAtOffset(0, -20);
                contentStream.showText("Report Type: " + summary.getOrDefault("reportType", "DAILY"));
                contentStream.newLineAtOffset(0, -20);
                contentStream.showText("Total Transactions: " + summary.getOrDefault("transactionCount", 0));
                contentStream.newLineAtOffset(0, -20);
                contentStream.showText("Total Sales: " + summary.getOrDefault("totalSales", 0));
                contentStream.newLineAtOffset(0, -20);
                contentStream.showText("Total Tax: " + summary.getOrDefault("totalTax", 0));
                contentStream.newLineAtOffset(0, -20);
                contentStream.showText("Total Discount: " + summary.getOrDefault("totalDiscount", 0));
                contentStream.endText();
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }
}
