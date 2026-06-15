import { uexGet } from "./client";

const DAY = 86400;
const TEN_MIN = 600;

export interface Commodity {
  id: number;
  name: string;
  code: string;
  kind: string | null;
  is_buyable: number;
  is_sellable: number;
  is_mineral: number;
  is_raw: number;
  is_refined: number;
  is_refinable: number;
  is_harvestable: number;
  is_illegal: number;
  price_buy: number;
  price_sell: number;
}

export interface CommodityPrice {
  id_commodity: number;
  commodity_name: string;
  id_terminal: number;
  terminal_name: string;
  price_buy: number;
  price_sell: number;
  scu_buy: number;
  scu_sell: number;
  star_system_name: string | null;
  planet_name: string | null;
  date_modified: number;
}

export interface TradeRoute {
  id: number;
  commodity_name: string;
  origin_terminal_name: string;
  origin_terminal_code: string;
  destination_terminal_name: string;
  destination_terminal_code: string;
  price_origin: number;
  price_destination: number;
  profit: number;
  distance: number;
  price_margin: number;
  price_roi: number;
  investment: number;
  scu_reachable: number;
}

export interface Vehicle {
  id: number;
  name: string;
  name_full: string | null;
  company_name: string | null;
  scu: number | null;
  crew: number | string | null;
  mass: number | null;
  is_spaceship: number;
  is_cargo: number;
  url_store: string | null;
}

export interface VehiclePrice {
  id_vehicle: number;
  vehicle_name: string;
  terminal_name: string;
  price_buy: number;
  price_rent: number;
  star_system_name: string | null;
  planet_name: string | null;
}

export interface Terminal {
  id: number;
  name: string;
  code: string;
  type: string | null;
  star_system_name: string | null;
  planet_name: string | null;
  is_available: number;
}

export interface StarSystem {
  id: number;
  name: string;
  code: string;
  is_available: number;
}

export interface Planet {
  id: number;
  id_star_system: number;
  name: string;
  star_system_name: string | null;
}

export const getCommodities = () =>
  uexGet<Commodity[]>("commodities", { revalidate: DAY });

export const getCommodityPrices = (idCommodity: number) =>
  uexGet<CommodityPrice[]>("commodities_prices", { query: { id_commodity: idCommodity }, revalidate: TEN_MIN });

export const getTradeRoutes = (idCommodity?: number) =>
  uexGet<TradeRoute[]>("commodities_routes", { query: { id_commodity: idCommodity }, revalidate: TEN_MIN });

export const getVehicles = () =>
  uexGet<Vehicle[]>("vehicles", { revalidate: DAY });

export const getVehiclePrices = (idVehicle: number) =>
  uexGet<VehiclePrice[]>("vehicles_prices", { query: { id_vehicle: idVehicle }, revalidate: TEN_MIN });

export const getTerminals = () =>
  uexGet<Terminal[]>("terminals", { revalidate: DAY });

export const getStarSystems = () =>
  uexGet<StarSystem[]>("star_systems", { revalidate: DAY });

export const getPlanets = () =>
  uexGet<Planet[]>("planets", { revalidate: DAY });
