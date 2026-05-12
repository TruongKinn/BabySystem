package vn.agent.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.agent.common.Gender;
import vn.agent.common.UserStatus;
import vn.agent.common.UserType;
import vn.agent.controller.request.CreateUserRequest;
import vn.agent.exception.InvalidDataException;
import vn.agent.model.Role;
import vn.agent.model.User;
import vn.agent.model.UserHasRole;
import vn.agent.repository.RoleRepository;
import vn.agent.repository.UserAuditLogRepository;
import vn.agent.repository.UserHasRoleRepository;
import vn.agent.repository.UserRepository;

import java.util.Collections;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountUserWriteServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UserHasRoleRepository userHasRoleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private UserAuditLogRepository userAuditLogRepository;

    @Mock
    private org.keycloak.admin.client.Keycloak keycloakAdminClient;

    @InjectMocks
    private AccountUserWriteServiceImpl service;

    private CreateUserRequest request;

    @BeforeEach
    void setUp() {
        request = new CreateUserRequest();
        request.setFirstName("Alice");
        request.setLastName("Walker");
        request.setDateOfBirth(new Date());
        request.setGender(Gender.FEMALE);
        request.setPhone("0123456789");
        request.setEmail("alice@example.com");
        request.setUsername("alice");
        request.setPassword("secret123");
        request.setType(UserType.ADMIN);
    }

    @Test
    void createUserShouldPersistEncodedPasswordAndAssignRoles() {
        when(userRepository.findAllByUsernameIgnoreCase("alice")).thenReturn(Collections.emptyList());
        when(userRepository.findAllByEmailIgnoreCase("alice@example.com")).thenReturn(Collections.emptyList());
        when(passwordEncoder.encode("secret123")).thenReturn("encoded-secret");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(10L);
            return user;
        });

        Role userRole = new Role();
        userRole.setId(1L);
        userRole.setName("USER");
        Role adminRole = new Role();
        adminRole.setId(2L);
        adminRole.setName("ADMIN");
        when(roleRepository.findByName("USER")).thenReturn(userRole);
        when(roleRepository.findByName("ADMIN")).thenReturn(adminRole);
        when(userHasRoleRepository.findAllByUserId(10L)).thenReturn(Collections.emptyList());

        Long createdId = service.createUser(request);

        assertEquals(10L, createdId);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertEquals("encoded-secret", savedUser.getPassword());
        assertEquals(UserStatus.ACTIVE, savedUser.getStatus());
        assertEquals(UserType.ADMIN, savedUser.getType());

        ArgumentCaptor<UserHasRole> roleCaptor = ArgumentCaptor.forClass(UserHasRole.class);
        verify(userHasRoleRepository, times(2)).save(roleCaptor.capture());
        List<UserHasRole> savedMappings = roleCaptor.getAllValues();
        assertTrue(savedMappings.stream().anyMatch(item -> "USER".equals(item.getRole().getName())));
        assertTrue(savedMappings.stream().anyMatch(item -> "ADMIN".equals(item.getRole().getName())));
    }

    @Test
    void createUserShouldRejectDuplicateUsername() {
        when(userRepository.findAllByUsernameIgnoreCase("alice")).thenReturn(List.of(new User()));

        InvalidDataException exception = assertThrows(InvalidDataException.class, () -> service.createUser(request));

        assertEquals("Username already exists", exception.getMessage());
    }

    @Test
    void updateUserStatusShouldLockUser() {
        User user = new User();
        user.setId(5L);
        user.setUsername("alice");
        user.setStatus(UserStatus.ACTIVE);
        when(userRepository.findById(5L)).thenReturn(java.util.Optional.of(user));

        service.updateUserStatus(5L, UserStatus.LOCKED);

        assertEquals(UserStatus.LOCKED, user.getStatus());
        verify(userRepository).save(user);
        verify(userAuditLogRepository).save(any());
    }

    @Test
    void resetPasswordByAdminShouldRequirePasswordChangeOnNextLogin() {
        User user = new User();
        user.setId(8L);
        user.setUsername("bob");
        user.setPassword("old-password");
        user.setStatus(UserStatus.ACTIVE);

        when(userRepository.findById(8L)).thenReturn(java.util.Optional.of(user));
        when(passwordEncoder.encode("Temp@123")).thenReturn("encoded-temp");

        service.resetPasswordByAdmin(8L, "Temp@123");

        assertEquals("encoded-temp", user.getPassword());
        assertTrue(user.isRequirePasswordChange());
        verify(userRepository).save(user);
        verify(userAuditLogRepository).save(any());
    }
}
