import React, { useState, useEffect } from "react";

import Button from "@mui/material/Button";
import { Select, Tab, Tabs } from "@mui/material";
import { MenuItem } from "@mui/material";
import { Typography } from "@mui/material";
import { Box } from "@mui/material";
import { AppBar } from "@mui/material";
import { Toolbar } from "@mui/material";

import { Season } from "./enums";
import { FishCollectionModal } from "./FishCollectionModal";

import { CookingCollectionModal } from "./CookingCollectionModal";
import { Collections } from "./Collections";
import { Load, Save } from "./Save";
import { FishPage } from "./FishPage";
import { CookingPage } from "./CookingPage";
import { ShippingCollectionModal } from "./ShippingCollectionModal";
import { ShippingPage } from "./ShippingPage";
import { MuseumPage } from "./MuseumPage";
import { MuseumCollectionModal } from "./MuseumCollectionModal";

enum SDVTab {
  FISHING,
  COOKING,
  SHIPPING,
  MUSEUM,
}

const App = (): React.ReactElement => {
  const [collections, setCollections] = useState<Collections>(Load());
  const [season, setSeason] = useState<Season>(Season.SPRING);
  const [fishOpen, setFishOpen] = useState(false);
  const [cookingOpen, setCookingOpen] = useState(false);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [museumOpen, setMuseumOpen] = useState(false);
  const [tab, setTab] = useState(SDVTab.FISHING);

  useEffect(() => {
    Save(collections);
  }, [collections]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Stardew perfection tracker
          </Typography>
          <Button onClick={() => setFishOpen(true)}>
            <Typography color="secondary">Open Fish collection</Typography>
          </Button>
          <Button onClick={() => setCookingOpen(true)}>
            <Typography color="secondary">Open Cooking collection</Typography>
          </Button>
          <Button onClick={() => setShippingOpen(true)}>
            <Typography color="secondary">Open Shipping collection</Typography>
          </Button>
          <Button onClick={() => setMuseumOpen(true)}>
            <Typography color="secondary">Open Museum collection</Typography>
          </Button>
          <Select
            value={season}
            onChange={(s) => setSeason(s.target.value as Season)}
          >
            <MenuItem value={Season.SPRING}>{Season.SPRING}</MenuItem>
            <MenuItem value={Season.SUMMER}>{Season.SUMMER}</MenuItem>
            <MenuItem value={Season.FALL}>{Season.FALL}</MenuItem>
            <MenuItem value={Season.WINTER}>{Season.WINTER}</MenuItem>
          </Select>
        </Toolbar>
      </AppBar>
      <Tabs
        variant="fullWidth"
        sx={{ width: "100%" }}
        value={tab}
        onChange={(_, t) => setTab(t)}
      >
        <Tab label="Fishing" />
        <Tab label="Cooking" />
        <Tab label="Shipping" />
        <Tab label="Museum" />
      </Tabs>

      <Box
        sx={{
          backgroundColor: "#282c34",
          color: "white",
        }}
      >
        {tab === SDVTab.FISHING && (
          <FishPage
            season={season}
            collections={collections}
            setCollections={setCollections}
          />
        )}
        {tab === SDVTab.COOKING && (
          <CookingPage
            season={season}
            collections={collections}
            setCollections={setCollections}
          />
        )}
        {tab === SDVTab.SHIPPING && (
          <ShippingPage
            season={season}
            collections={collections}
            setCollections={setCollections}
          />
        )}
        {tab === SDVTab.MUSEUM && (
          <MuseumPage
            collections={collections}
            setCollections={setCollections}
          />
        )}
      </Box>

      <FishCollectionModal
        open={fishOpen}
        onClose={() => setFishOpen(false)}
        collections={collections}
        setCollection={setCollections}
      />
      <CookingCollectionModal
        open={cookingOpen}
        onClose={() => setCookingOpen(false)}
        collections={collections}
        setCollection={setCollections}
      />
      <ShippingCollectionModal
        open={shippingOpen}
        onClose={() => setShippingOpen(false)}
        collections={collections}
        setCollection={setCollections}
      />
      <MuseumCollectionModal
        open={museumOpen}
        onClose={() => setMuseumOpen(false)}
        collections={collections}
        setCollection={setCollections}
      />
    </Box>
  );
};

export default App;
