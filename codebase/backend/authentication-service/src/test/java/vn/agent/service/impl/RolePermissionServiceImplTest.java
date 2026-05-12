package vn.agent.service.impl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.agent.common.PermissionType;
import vn.agent.controller.request.CreatePermissionRequest;
import vn.agent.controller.request.CreateRoleRequest;
import vn.agent.controller.request.UpdatePermissionRequest;
import vn.agent.controller.request.UpdateRoleRequest;
import vn.agent.controller.request.UpdateRolePermissionsRequest;
import vn.agent.controller.response.PermissionResponse;
import vn.agent.controller.response.RolePermissionResponse;
import vn.agent.exception.InvalidDataException;
import vn.agent.model.Permission;
import vn.agent.model.Role;
import vn.agent.repository.PermissionRepository;
import vn.agent.repository.RoleHasPermissionRepository;
import vn.agent.repository.RoleRepository;
import vn.agent.repository.UserHasRoleRepository;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RolePermissionServiceImplTest {

    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PermissionRepository permissionRepository;
    @Mock
    private RoleHasPermissionRepository roleHasPermissionRepository;
    @Mock
    private UserHasRoleRepository userHasRoleRepository;

    @InjectMocks
    private RolePermissionServiceImpl service;

    @Test
    void createRoleShouldNormalizeNameAndPersistPermissionMappings() {
        CreateRoleRequest request = new CreateRoleRequest();
        request.setName("dispatcher");
        request.setPermissionIds(List.of(1L, 2L));

        Permission p1 = new Permission();
        p1.setId(1L);
        Permission p2 = new Permission();
        p2.setId(2L);

        when(roleRepository.existsByNameIgnoreCase("DISPATCHER")).thenReturn(false);
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> {
            Role role = invocation.getArgument(0);
            role.setId(10L);
            return role;
        });
        when(permissionRepository.findAllById(anyIterable())).thenReturn(List.of(p1, p2));

        RolePermissionResponse response = service.createRole(request);

        assertEquals(10L, response.getId());
        assertEquals("DISPATCHER", response.getName());
        assertEquals(List.of(1L, 2L), response.getPermissionIds());

        ArgumentCaptor<Role> roleCaptor = ArgumentCaptor.forClass(Role.class);
        verify(roleRepository).save(roleCaptor.capture());
        assertEquals("DISPATCHER", roleCaptor.getValue().getName());
        verify(roleHasPermissionRepository).saveAll(any());
    }

    @Test
    void updateRolePermissionsShouldRejectUnknownPermission() {
        Role role = new Role();
        role.setId(3L);
        role.setName("USER");

        UpdateRolePermissionsRequest request = new UpdateRolePermissionsRequest();
        request.setPermissionIds(List.of(99L));

        when(roleRepository.findById(3L)).thenReturn(Optional.of(role));
        when(permissionRepository.findAllById(anyIterable())).thenReturn(List.of());

        InvalidDataException exception = assertThrows(InvalidDataException.class,
                () -> service.updateRolePermissions(3L, request));
        assertEquals("Permission not found: [99]", exception.getMessage());
    }

    @Test
    void createPermissionShouldValidateTypeSpecificFields() {
        CreatePermissionRequest request = new CreatePermissionRequest();
        request.setName("menu:test");
        request.setType(PermissionType.MENU);

        when(permissionRepository.findByNameIgnoreCase("MENU:TEST")).thenReturn(Optional.empty());

        InvalidDataException exception = assertThrows(InvalidDataException.class,
                () -> service.createPermission(request));
        assertEquals("menuKey is required for MENU permission", exception.getMessage());
    }

    @Test
    void createPermissionShouldSaveApiPermission() {
        CreatePermissionRequest request = new CreatePermissionRequest();
        request.setName("api:get:test");
        request.setType(PermissionType.API);
        request.setApiMethod("get");
        request.setApiPath("/auth/test");
        request.setDescription("test");

        when(permissionRepository.findByNameIgnoreCase("API:GET:TEST")).thenReturn(Optional.empty());
        when(permissionRepository.save(any(Permission.class))).thenAnswer(invocation -> {
            Permission p = invocation.getArgument(0);
            p.setId(5L);
            return p;
        });

        PermissionResponse response = service.createPermission(request);

        assertEquals(5L, response.getId());
        assertEquals(PermissionType.API, response.getType());
        assertEquals("GET", response.getApiMethod());
        assertEquals("/auth/test", response.getApiPath());
    }

    @Test
    void updateRoleShouldNormalizeAndPersistName() {
        Role role = new Role();
        role.setId(9L);
        role.setName("USER");

        UpdateRoleRequest request = new UpdateRoleRequest();
        request.setName("operator");

        when(roleRepository.findById(9L)).thenReturn(Optional.of(role));
        when(roleRepository.existsByNameIgnoreCase("OPERATOR")).thenReturn(false);
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(roleHasPermissionRepository.findAllByRole_Id(9L)).thenReturn(List.of());

        RolePermissionResponse response = service.updateRole(9L, request);

        assertEquals("OPERATOR", response.getName());
    }

    @Test
    void updatePermissionShouldKeepTypeAndNormalizeApiMethod() {
        Permission permission = new Permission();
        permission.setId(11L);
        permission.setName("API:GET:OLD");
        permission.setType(PermissionType.API);
        permission.setApiMethod("GET");
        permission.setApiPath("/old");

        UpdatePermissionRequest request = new UpdatePermissionRequest();
        request.setName("api:patch:new");
        request.setApiMethod("patch");
        request.setApiPath("/new-path");
        request.setDescription("updated");

        when(permissionRepository.findById(11L)).thenReturn(Optional.of(permission));
        when(permissionRepository.findByNameIgnoreCase("API:PATCH:NEW")).thenReturn(Optional.empty());
        when(permissionRepository.save(any(Permission.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PermissionResponse response = service.updatePermission(11L, request);

        assertEquals("API:PATCH:NEW", response.getName());
        assertEquals("PATCH", response.getApiMethod());
        assertEquals("/new-path", response.getApiPath());
    }
}
