package com.retailtouch.inventory.repository;

import com.retailtouch.inventory.entity.Category;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CategoryRepository extends MongoRepository<Category, String> {
}
