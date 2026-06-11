package com.retailtouch.inventory.repository;

import com.retailtouch.inventory.entity.Product;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends MongoRepository<Product, String> {
    Optional<Product> findBySku(String sku);

    Optional<Product> findByBarcode(String barcode);

    // Search by name (regex, case-insensitive), barcode (exact), sku (exact),
    // categoryId (exact), or categoryName (regex, case-insensitive)
    @Query("{ '$or': [ " +
            "{ 'name':         { '$regex': ?0, '$options': 'i' } }, " +
            "{ 'barcode':      ?0 }, " +
            "{ 'sku':          ?0 }, " +
            "{ 'categoryId':   ?0 }, " +
            "{ 'categoryName': { '$regex': ?0, '$options': 'i' } } " +
            "] }")
    List<Product> searchByKeyword(String keyword);

    List<Product> findByCategoryId(String categoryId);

    List<Product> findByCurrentStockLessThanEqual(int threshold);

    boolean existsBySku(String sku);

    boolean existsByBarcode(String barcode);
}
