#!/bin/bash

# Define the assets directory and output file
ASSETS_DIR="./assets"
OUTPUT_FILE="./assets/assets.json"

# Check if the assets directory exists
if [ ! -d "$ASSETS_DIR" ]; then
    echo "Error: Assets directory '$ASSETS_DIR' does not exist."
    exit 1
fi

# Start building the JSON array
echo "[" > "$OUTPUT_FILE"

# Initialize variables
FIRST=true

# Function to process files with a specific extension
process_files() {
    local EXTENSION=$1
    for file in "$ASSETS_DIR"/*.$EXTENSION; do
        # Check if any files with the given extension exist
        if [ ! -e "$file" ]; then
            continue
        fi

        # Append a comma on the same line if this is not the first file
        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            echo "," >> "$OUTPUT_FILE"
        fi

        # Add the filename to the JSON array
        BASENAME=$(basename "$file")
        echo "  \"$BASENAME\"" >> "$OUTPUT_FILE"
    done
}

# Process .splat files
process_files "splat"

# Process .ply files
process_files "ply"

# Process .spz files
process_files "spz"

# If no files were found, output an empty JSON array
if [ "$FIRST" = true ]; then
    echo "[]" > "$OUTPUT_FILE"
else
    # End the JSON array
    echo "]" >> "$OUTPUT_FILE"
fi

echo "Successfully generated '$OUTPUT_FILE'."
