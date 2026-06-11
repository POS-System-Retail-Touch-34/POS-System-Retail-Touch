package com.retailtouch.reporting.service;

import org.springframework.data.domain.Sort;
// import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import java.math.BigDecimal;
import java.math.RoundingMode;

// @Slf4j
@Service
@SuppressWarnings({ "unchecked", "rawtypes" })
public class ReportService {

        private final MongoTemplate mongoTemplate;

        public ReportService(MongoTemplate mongoTemplate) {
                this.mongoTemplate = mongoTemplate;
        }

        private static final String COLLECTION = "transactions";

        public Map<String, Object> getDailySummary(LocalDate date) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();

                MatchOperation match = Aggregation.match(
                                Criteria.where("timestamp").gte(start).lt(end)
                                                .and("status").is("COMPLETED"));
                GroupOperation group = Aggregation.group()
                                .count().as("transactionCount")
                                .sum("total").as("totalSales")
                                .sum("tax").as("totalTax")
                                .sum("discount").as("totalDiscount");

                Aggregation agg = Aggregation.newAggregation(match, group);
                AggregationResults<Map> results = mongoTemplate.aggregate(agg, COLLECTION, Map.class);
                Map<String, Object> summary = results.getUniqueMappedResult();
                if (summary == null) {
                        return Map.of("date", date.toString(), "transactionCount", 0,
                                        "totalSales", 0, "totalTax", 0, "totalDiscount", 0, "totalRefunds", 0,
                                        "netSales", 0);
                }
                summary.put("date", date.toString());
                summary.put("reportType", "X-READ");
                summary.put("totalRefunds", 0);
                summary.put("netSales", summary.getOrDefault("totalSales", 0));
                return summary;
        }

        public Map<String, Object> getZReport(LocalDate date) {
                Map<String, Object> summary = getDailySummary(date);

                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();

                MatchOperation matchCompleted = Aggregation.match(
                                Criteria.where("timestamp").gte(start).lt(end).and("status").is("COMPLETED"));
                UnwindOperation unwindPayments = Aggregation.unwind("payments");
                GroupOperation groupByPayment = Aggregation.group("payments.method")
                                .sum("payments.amount").as("totalAmount")
                                .count().as("transactionCount");

                Aggregation paymentAgg = Aggregation.newAggregation(matchCompleted, unwindPayments, groupByPayment);
                List<Map> paymentBreakdown = mongoTemplate.aggregate(paymentAgg, COLLECTION, Map.class)
                                .getMappedResults();

                long refundCount = mongoTemplate.count(
                                new org.springframework.data.mongodb.core.query.Query(
                                                Criteria.where("timestamp").gte(start).lt(end).and("status")
                                                                .is("REFUNDED")),
                                COLLECTION);

                MatchOperation matchRefunded = Aggregation.match(
                                Criteria.where("timestamp").gte(start).lt(end).and("status").is("REFUNDED"));
                GroupOperation groupRefunded = Aggregation.group().sum("total").as("totalRefunds");
                Aggregation refundAgg = Aggregation.newAggregation(matchRefunded, groupRefunded);
                Map refundSummary = mongoTemplate.aggregate(refundAgg, COLLECTION, Map.class).getUniqueMappedResult();
                Number totalRefunds = refundSummary != null && refundSummary.get("totalRefunds") instanceof Number
                                ? (Number) refundSummary.get("totalRefunds")
                                : 0;

                Number totalSales = summary.get("totalSales") instanceof Number ? (Number) summary.get("totalSales") : 0;
                double netSales = totalSales.doubleValue() - totalRefunds.doubleValue();

                summary.put("paymentBreakdown", paymentBreakdown);
                summary.put("refundCount", refundCount);
                summary.put("totalRefunds", totalRefunds);
                summary.put("netSales", netSales);
                summary.put("reportType", "Z-READ");
                summary.put("generatedAt", LocalDateTime.now().toString());
                summary.put("status", "CLOSED");
                return summary;
        }

        public List<Map<String, Object>> getSalesByCategory(LocalDate date) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();

                MatchOperation match = Aggregation.match(
                                Criteria.where("timestamp").gte(start).lt(end).and("status").is("COMPLETED"));
                UnwindOperation unwind = Aggregation.unwind("items");
                GroupOperation group = Aggregation.group("items.categoryName")
                                .sum("items.subTotal").as("totalSales")
                                .count().as("itemsSold");
                SortOperation sort = Aggregation.sort(Sort.Direction.DESC, "totalSales");

                Aggregation agg = Aggregation.newAggregation(match, unwind, group, sort);
                return mongoTemplate.aggregate(agg, COLLECTION, Map.class)
                                .getMappedResults()
                                .stream()
                                .map(m -> (Map<String, Object>) (Map<?, ?>) m)
                                .toList();
        }

        public List<Map<String, Object>> getSalesByEmployee(LocalDate date) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();

                MatchOperation match = Aggregation.match(
                                Criteria.where("timestamp").gte(start).lt(end).and("status").is("COMPLETED"));
                GroupOperation group = Aggregation.group("cashierId")
                                .count().as("transactionCount")
                                .sum("total").as("totalSales");
                SortOperation sort = Aggregation.sort(Sort.Direction.DESC, "totalSales");

                Aggregation agg = Aggregation.newAggregation(match, group, sort);
                return mongoTemplate.aggregate(agg, COLLECTION, Map.class)
                                .getMappedResults()
                                .stream()
                                .map(m -> (Map<String, Object>) (Map<?, ?>) m)
                                .toList();
        }

        public List<Map<String, Object>> getTopProducts(LocalDate date, int limit) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();

                MatchOperation match = Aggregation.match(
                                Criteria.where("timestamp").gte(start).lt(end).and("status").is("COMPLETED"));
                UnwindOperation unwind = Aggregation.unwind("items");
                GroupOperation group = Aggregation.group("items.productId")
                                .first("items.productName").as("productName")
                                .first("items.sku").as("sku")
                                .sum("items.quantity").as("totalQuantity")
                                .sum("items.subTotal").as("totalRevenue");
                SortOperation sort = Aggregation.sort(Sort.Direction.DESC, "totalQuantity");
                LimitOperation limitOp = Aggregation.limit(limit);

                Aggregation agg = Aggregation.newAggregation(match, unwind, group, sort, limitOp);
                return mongoTemplate.aggregate(agg, COLLECTION, Map.class)
                                .getMappedResults()
                                .stream()
                                .map(m -> (Map<String, Object>) (Map<?, ?>) m)
                                .toList();
        }

        public List<Map<String, Object>> getHourlyBreakdown(LocalDate date) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();

                MatchOperation match = Aggregation.match(
                                Criteria.where("timestamp").gte(start).lt(end).and("status").is("COMPLETED"));
                ProjectionOperation project = Aggregation.project("total", "timestamp")
                                .and(DateOperators.Hour.hourOf("timestamp")).as("hour");
                GroupOperation group = Aggregation.group("hour")
                                .count().as("transactionCount")
                                .sum("total").as("totalSales");
                SortOperation sort = Aggregation.sort(Sort.Direction.ASC, "_id");

                Aggregation agg = Aggregation.newAggregation(match, project, group, sort);
                return mongoTemplate.aggregate(agg, COLLECTION, Map.class)
                                .getMappedResults()
                                .stream()
                                .map(m -> (Map<String, Object>) (Map<?, ?>) m)
                                .toList();
        }

        public List<Map<String, Object>> getAllTransactions(LocalDate date) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();

                org.springframework.data.mongodb.core.query.Query query = new org.springframework.data.mongodb.core.query.Query(
                                Criteria.where("timestamp").gte(start).lt(end));
                return mongoTemplate.find(query, Map.class, COLLECTION)
                                .stream()
                                .map(m -> (Map<String, Object>) (Map<?, ?>) m)
                                .toList();
        }

        public List<Map<String, Object>> getSalesTrend(int days) {
                int safeDays = Math.max(1, Math.min(days, 365));
                LocalDate endDate = LocalDate.now(ZoneId.of("Asia/Kolkata"));
                LocalDate startDate = endDate.minusDays(safeDays - 1L);
                LocalDateTime start = startDate.atStartOfDay();
                LocalDateTime end = endDate.plusDays(1).atStartOfDay();

                MatchOperation match = Aggregation.match(
                                Criteria.where("timestamp").gte(start).lt(end).and("status").is("COMPLETED"));
                ProjectionOperation project = Aggregation.project("total", "timestamp")
                                .and(DateOperators.DateToString.dateOf("timestamp").toString("%Y-%m-%d")).as("day");
                GroupOperation group = Aggregation.group("day")
                                .sum("total").as("sales")
                                .count().as("orders");
                SortOperation sort = Aggregation.sort(Sort.Direction.ASC, "_id");

                Aggregation agg = Aggregation.newAggregation(match, project, group, sort);
                return mongoTemplate.aggregate(agg, COLLECTION, Map.class)
                                .getMappedResults()
                                .stream()
                                .map(row -> {
                                        Map<String, Object> mapped = new LinkedHashMap<>();
                                        mapped.put("date", row.get("_id"));
                                        mapped.put("sales", row.getOrDefault("sales", 0));
                                        mapped.put("orders", row.getOrDefault("orders", 0));
                                        return mapped;
                                })
                                .map(m -> (Map<String, Object>) (Map<?, ?>) m)
                                .toList();
        }

        public List<Map<String, Object>> getPaymentBreakdown(int days) {
                int safeDays = Math.max(1, Math.min(days, 365));
                LocalDate endDate = LocalDate.now(ZoneId.of("Asia/Kolkata"));
                LocalDate startDate = endDate.minusDays(safeDays - 1L);
                LocalDateTime start = startDate.atStartOfDay();
                LocalDateTime end = endDate.plusDays(1).atStartOfDay();

                MatchOperation match = Aggregation.match(
                                Criteria.where("timestamp").gte(start).lt(end).and("status").is("COMPLETED"));
                UnwindOperation unwindPayments = Aggregation.unwind("payments");
                GroupOperation group = Aggregation.group("payments.method")
                                .sum("payments.amount").as("totalAmount")
                                .count().as("transactionCount");
                SortOperation sort = Aggregation.sort(Sort.Direction.DESC, "totalAmount");

                Aggregation agg = Aggregation.newAggregation(match, unwindPayments, group, sort);
                List<Map> rows = mongoTemplate.aggregate(agg, COLLECTION, Map.class).getMappedResults();

                BigDecimal grandTotal = rows.stream()
                                .map(row -> asBigDecimal(row.get("totalAmount")))
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                List<Map<String, Object>> result = new ArrayList<>();
                for (Map row : rows) {
                        BigDecimal amount = asBigDecimal(row.get("totalAmount"));
                        BigDecimal percentage = grandTotal.compareTo(BigDecimal.ZERO) == 0
                                        ? BigDecimal.ZERO
                                        : amount.multiply(BigDecimal.valueOf(100))
                                                        .divide(grandTotal, 2, RoundingMode.HALF_UP);
                        Map<String, Object> mapped = new LinkedHashMap<>();
                        mapped.put("method", row.get("_id"));
                        mapped.put("amount", amount);
                        mapped.put("transactionCount", row.getOrDefault("transactionCount", 0));
                        mapped.put("percentage", percentage);
                        result.add(mapped);
                }
                return result;
        }

        public Map<String, Object> getDashboardMetrics(int days) {
                List<Map<String, Object>> salesTrend = getSalesTrend(days);
                BigDecimal totalSales = salesTrend.stream()
                                .map(row -> asBigDecimal(row.get("sales")))
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                long totalOrders = salesTrend.stream()
                                .mapToLong(row -> ((Number) row.getOrDefault("orders", 0)).longValue())
                                .sum();
                BigDecimal avgOrderValue = totalOrders == 0
                                ? BigDecimal.ZERO
                                : totalSales.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP);

                Map<String, Object> dashboard = new LinkedHashMap<>();
                dashboard.put("days", days);
                dashboard.put("totalSales", totalSales);
                dashboard.put("totalOrders", totalOrders);
                dashboard.put("averageOrderValue", avgOrderValue);
                dashboard.put("paymentBreakdown", getPaymentBreakdown(days));
                return dashboard;
        }

        private BigDecimal asBigDecimal(Object value) {
                if (value instanceof BigDecimal bd) {
                        return bd;
                }
                if (value instanceof Number num) {
                        return BigDecimal.valueOf(num.doubleValue());
                }
                return BigDecimal.ZERO;
        }
}
