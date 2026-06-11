package com.retailtouch.customer.repository;

import com.retailtouch.customer.entity.Customer;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends MongoRepository<Customer, String> {
    Optional<Customer> findByPhone(String phone);

    Optional<Customer> findByEmail(String email);

    @org.springframework.data.mongodb.repository.Query("{ '$or': [ { 'name': { '$regex': ?0, '$options': 'i' } }, { 'phone': { '$regex': ?0, '$options': 'i' } } ] }")
    List<Customer> searchByKeyword(String keyword);

    List<Customer> findTop10ByOrderByLastPurchaseDateDesc();

    boolean existsByPhone(String phone);

    boolean existsByEmail(String email);
}
