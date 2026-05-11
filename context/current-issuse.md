Resolve these build related issuses.

- Type check is failed in build and giving me this error.

./app/api/projects/[projectId]/route.ts:17:40
Type error: This expression is not callable.
  Each member of the union type '(<This, FormalArgs extends _prisma_client_runtime_client.Args<This, "findUnique"> & PrismaCacheStrategy, ActualArgs extends FormalArgs>(this: This, args: { [key in keyof ActualArgs]: key extends keyof FormalArgs ? ActualArgs[key] : never; } & (ActualArgs extends { ...; } ? "Please either choose `select` or `include`...' has signatures, but none of those signatures are compatible with each other.

  15 |   projectId: string,
  16 | ): Promise<string | null> {
> 17 |   const project = await prisma.project.findUnique({
     |                                        ^
  18 |     where: {
  19 |       id: projectId,
  20 |     },
Next.js build worker exited with code: 1 and signal: null
 ELIFECYCLE  Command failed with exit code 1.

- also add a type-check same as lint and build testing
