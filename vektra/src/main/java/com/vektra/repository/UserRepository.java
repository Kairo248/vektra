package com.vektra.repository;

import com.vektra.dto.response.AdminUserListItem;
import com.vektra.entity.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, Long> {

    @Query(
            "select new com.vektra.dto.response.AdminUserListItem(u.id, u.name, u.surname, a.id, a.email, "
                    + "a.accountState) from User u join Account a on a.userId = u.id order by u.id desc")
    List<AdminUserListItem> findAllUsersWithAccounts();
}