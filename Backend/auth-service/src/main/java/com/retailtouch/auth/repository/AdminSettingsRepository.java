package com.retailtouch.auth.repository;

import com.retailtouch.auth.entity.AdminSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminSettingsRepository extends JpaRepository<AdminSettings, Long> {
}