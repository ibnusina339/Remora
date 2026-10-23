idf_component_register(SRCS "src/power_policy.cpp" "src/semver.cpp" "src/game_engine.cpp" "src/game_memory.cpp" "src/game_maze.cpp" "src/game_reflex.cpp" "src/game_codes.cpp" "src/game_arcade.cpp" INCLUDE_DIRS "include")
target_compile_features(${COMPONENT_LIB} PUBLIC cxx_std_17)
