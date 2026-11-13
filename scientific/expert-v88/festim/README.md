# FESTIM adoption

[Native validation packet](validated/README.md): actual FESTIM 2.2 / dolfinx 0.11.0 / PETSc 3.25.6 on Linux ARM64. The frozen study passed 36 native runs, 94 numerical gates and nine adversarial integration tests. `validated/HASHES.sha256` matches every exported source, lock, receipt and result to its guest copy.

An independent reviewer traced the equations and native API, matched the canonical source/result hashes and reran all nine tests successfully in the retained guest. The separate receipt is `../review/festim/independent-test.log` (SHA256 `d5a60196e94b5cf631612a7ae04437e29f925b1ae5ba02cef92c05237ee17f4a`). No blocking issue was found within the declared synthetic scope.

This is a usable reference adapter for synthetic two-isotope diffusion, competitive trapping, constant-Cp heat and temperature-dependent diffusion. It is not connected to the live target solver and provides no measured LiT parameters or experimental qualification. The native coupled class advances heat then hydrogen; reaction heat and exact variable-Cp enthalpy require additional work before a target migration.

The existing live target combines custom stopping, fusion depletion, replacement, diffusion and conduction. FESTIM is chosen to independently check the material-transport primitives; replacing the entire coupled model would discard application-specific ledgers and introduce an unqualified heat law.

`failed-install/` preserves the first native attempt: the host APFS backing volume filled despite logical guest free space, corrupting package extraction. Its source/solver locks and failure receipt were exported and hash-verified before deleting only its stopped owned volume. The successful retry uses upstream-supported native FEniCS plus pip FESTIM/io4dolfinx, excluding optional plotting dependencies. No package stubs, dependency patches or host execution were used.

The clean successful guest is `/private/tmp/mass-spinner-festim-v88-retry-20261112`, volume `safe-dev-413f05df90daf334`; its retained environment is 2.0 GiB and cleaned cache 28 MiB. Reinstallation and offline run commands, package licenses, primary sources and current adoption limits are in the packet README.
